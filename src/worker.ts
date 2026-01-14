import { env, connectDatabase, ensureQueueExists } from './config/index.js';
import {
  receiveMessage,
  deleteMessage,
  parseMessageBody,
  sendCepToQueue,
  type CepMessage,
} from './services/queue.service.js';
import { fetchCep, isRetryableError } from './services/viacep.service.js';
import { updateCrawlProgress, saveResult } from './services/crawl.service.js';

function getBackoffDelay(attempt: number): number {
  // Base delay: 1s, 2s, 4s for attempts 1, 2, 3
  return Math.min(1000 * Math.pow(2, attempt - 1), 10000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleSuccess(crawlId: string, cep: string, result: Awaited<ReturnType<typeof fetchCep>>, attempt: number): Promise<void> {
  await saveResult(crawlId, cep, true, result.found, result.data, null, attempt);
  await updateCrawlProgress(crawlId, true);
  
  const status = result.found ? 'found' : 'not found (processed successfully)';
  console.log(`CEP ${cep} ${status}`);
}

async function handleRetry(crawlId: string, cep: string, attempt: number): Promise<void> {
  const backoffDelay = getBackoffDelay(attempt);
  console.log(`CEP ${cep} failed (retryable), will retry in ${backoffDelay}ms`);
  
  await sleep(backoffDelay);
  await sendCepToQueue({ crawlId, cep, attempt: attempt + 1 });
}

async function handleFailure(crawlId: string, cep: string, error: string | null, attempt: number): Promise<void> {
  await saveResult(crawlId, cep, false, false, null, error, attempt);
  await updateCrawlProgress(crawlId, false);
  console.log(`CEP ${cep} failed: ${error}`);
}

async function processMessage(message: CepMessage): Promise<void> {
  const { crawlId, cep, attempt } = message;
  console.log(`Processing CEP ${cep} (attempt ${attempt}/${env.MAX_RETRIES}) for crawl ${crawlId}`);

  const result = await fetchCep(cep);

  if (result.success) {
    return handleSuccess(crawlId, cep, result, attempt);
  }

  const canRetry = isRetryableError(result.error) && attempt < env.MAX_RETRIES;
  
  if (canRetry) {
    return handleRetry(crawlId, cep, attempt);
  }

  return handleFailure(crawlId, cep, result.error, attempt);
}

async function startWorker(): Promise<void> {
  console.log('Starting worker...');
  console.log(`Rate limit: ${env.RATE_LIMIT_MS}ms (${1000 / env.RATE_LIMIT_MS} req/s)`);
  console.log(`Max retries: ${env.MAX_RETRIES}`);

  let lastProcessTime = 0;

  while (true) {
    try {
      const message = await receiveMessage();

      if (!message || !message.Body || !message.ReceiptHandle) {
        continue;
      }

      const now = Date.now();
      const timeSinceLastProcess = now - lastProcessTime;
      
      if (timeSinceLastProcess < env.RATE_LIMIT_MS) {
        await sleep(env.RATE_LIMIT_MS - timeSinceLastProcess);
      }

      const cepMessage = parseMessageBody(message.Body);
      await processMessage(cepMessage);

      lastProcessTime = Date.now();

      await deleteMessage(message.ReceiptHandle);
    } catch (error) {
      console.error('Worker error:', error);
      await sleep(5000);
    }
  }
}

async function main(): Promise<void> {
  try {
    await connectDatabase();

    await ensureQueueExists();

    await startWorker();
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  process.exit(0);
});

main();
