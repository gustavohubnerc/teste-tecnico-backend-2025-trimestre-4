export {
  createCrawl,
  getCrawlStatus,
  getCrawlResults,
  updateCrawlProgress,
  saveResult,
  type CreateCrawlParams,
  type CrawlStatusResponse,
  type PaginatedResults,
} from './crawl.service.js';

export {
  sendCepToQueue,
  sendCepBatchToQueue,
  receiveMessage,
  deleteMessage,
  parseMessageBody,
  type CepMessage,
} from './queue.service.js';

export {
  fetchCep,
  isRetryableError,
  type ViaCepResponse,
} from './viacep.service.js';
