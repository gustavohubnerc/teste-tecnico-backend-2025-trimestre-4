import {
  SQSClient,
  CreateQueueCommand,
  GetQueueUrlCommand,
} from '@aws-sdk/client-sqs';
import { env } from './env.js';

export const sqsClient = new SQSClient({
  endpoint: env.SQS_ENDPOINT,
  region: env.SQS_REGION,
  credentials: {
    accessKeyId: env.SQS_ACCESS_KEY_ID,
    secretAccessKey: env.SQS_SECRET_ACCESS_KEY,
  },
});

export async function ensureQueueExists(): Promise<string> {
  const queueName = 'cep-queue';

  try {
    // Try to get the queue URL first
    const getUrlCommand = new GetQueueUrlCommand({ QueueName: queueName });
    const response = await sqsClient.send(getUrlCommand);
    console.log('SQS queue found:', response.QueueUrl);
    return response.QueueUrl!;
  } catch (error: any) {
    if (error.name === 'QueueDoesNotExist' || error.Code === 'AWS.SimpleQueueService.NonExistentQueue') {
      // Queue doesn't exist, create it
      const createCommand = new CreateQueueCommand({
        QueueName: queueName,
        Attributes: {
          VisibilityTimeout: '60',
          MessageRetentionPeriod: '86400',
        },
      });
      const response = await sqsClient.send(createCommand);
      console.log('SQS queue created:', response.QueueUrl);
      return response.QueueUrl!;
    }
    throw error;
  }
}
