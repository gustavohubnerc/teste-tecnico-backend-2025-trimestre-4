import dotenv from 'dotenv';

dotenv.config();

export const env = {
  // Server
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/cep-crawler',

  // SQS (ElasticMQ)
  SQS_ENDPOINT: process.env.SQS_ENDPOINT || 'http://localhost:9324',
  SQS_REGION: process.env.SQS_REGION || 'us-east-1',
  SQS_ACCESS_KEY_ID: process.env.SQS_ACCESS_KEY_ID || 'x',
  SQS_SECRET_ACCESS_KEY: process.env.SQS_SECRET_ACCESS_KEY || 'x',
  SQS_QUEUE_URL: process.env.SQS_QUEUE_URL || 'http://localhost:9324/000000000000/cep-queue',

  // Crawler Config
  MAX_CEP_RANGE: parseInt(process.env.MAX_CEP_RANGE || '1000', 10),
  RATE_LIMIT_MS: parseInt(process.env.RATE_LIMIT_MS || '50', 10),
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '3', 10),
} as const;
