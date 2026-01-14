import { v4 as uuidv4 } from 'uuid';
import { Crawl, type ICrawl, type CrawlStatus } from '../models/Crawl.js';
import { Result, type IResult } from '../models/Result.js';
import { sendCepBatchToQueue, type CepMessage } from './queue.service.js';

export interface CreateCrawlParams {
  cepStart: string;
  cepEnd: string;
}

export interface CrawlStatusResponse {
  crawl_id: string;
  cep_start: string;
  cep_end: string;
  total_ceps: number;
  processed: number;
  successes: number;
  error_count: number;
  status: CrawlStatus;
  created_at: Date;
  updated_at: Date;
}

export interface PaginatedResults {
  crawl_id: string;
  results: Array<{
    cep: string;
    success: boolean;
    found: boolean;
    data: object | null;
    error: string | null;
    processed_at: Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

function generateCepRange(start: string, end: string): string[] {
  const startNum = parseInt(start, 10);
  const endNum = parseInt(end, 10);
  const ceps: string[] = [];

  for (let i = startNum; i <= endNum; i++) {
    ceps.push(i.toString().padStart(8, '0'));
  }

  return ceps;
}

export async function createCrawl(params: CreateCrawlParams): Promise<string> {
  const crawlId = uuidv4();
  const ceps = generateCepRange(params.cepStart, params.cepEnd);

  await Crawl.create({
    crawlId,
    cepStart: params.cepStart,
    cepEnd: params.cepEnd,
    totalCeps: ceps.length,
    processed: 0,
    successes: 0,
    errorCount: 0,
    status: 'pending',
  });

  const messages: CepMessage[] = ceps.map((cep) => ({
    crawlId,
    cep,
    attempt: 1,
  }));

  await sendCepBatchToQueue(messages);

  return crawlId;
}

export async function getCrawlStatus(crawlId: string): Promise<CrawlStatusResponse | null> {
  const crawl = await Crawl.findOne({ crawlId });

  if (!crawl) {
    return null;
  }

  return {
    crawl_id: crawl.crawlId,
    cep_start: crawl.cepStart,
    cep_end: crawl.cepEnd,
    total_ceps: crawl.totalCeps,
    processed: crawl.processed,
    successes: crawl.successes,
    error_count: crawl.errorCount,
    status: crawl.status,
    created_at: crawl.createdAt,
    updated_at: crawl.updatedAt,
  };
}

export async function getCrawlResults(
  crawlId: string,
  page: number,
  limit: number
): Promise<PaginatedResults | null> {
  const crawl = await Crawl.findOne({ crawlId });

  if (!crawl) {
    return null;
  }

  const skip = (page - 1) * limit;
  const total = await Result.countDocuments({ crawlId });
  const results = await Result.find({ crawlId })
    .sort({ processedAt: 1 })
    .skip(skip)
    .limit(limit);

  return {
    crawl_id: crawlId,
    results: results.map((r) => ({
      cep: r.cep,
      success: r.success,
      found: r.found,
      data: r.data,
      error: r.error,
      processed_at: r.processedAt,
    })),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}

export async function updateCrawlProgress(
  crawlId: string,
  success: boolean
): Promise<void> {
  const update: any = {
    $inc: {
      processed: 1,
      ...(success ? { successes: 1 } : { errorCount: 1 }),
    },
  };

  const crawl = await Crawl.findOneAndUpdate(
    { crawlId },
    update,
    { new: true }
  );

  if (crawl) {
    let newStatus: CrawlStatus = crawl.status;

    if (crawl.status === 'pending' && crawl.processed > 0) {
      newStatus = 'running';
    }

    if (crawl.processed >= crawl.totalCeps) {
      newStatus = crawl.errorCount === crawl.totalCeps ? 'failed' : 'finished';
    }

    if (newStatus !== crawl.status) {
      await Crawl.updateOne({ crawlId }, { status: newStatus });
    }
  }
}

export async function saveResult(
  crawlId: string,
  cep: string,
  success: boolean,
  found: boolean,
  data: object | null,
  error: string | null,
  attempts: number
): Promise<void> {
  await Result.create({
    crawlId,
    cep,
    success,
    found,
    data,
    error,
    attempts,
    processedAt: new Date(),
  });
}
