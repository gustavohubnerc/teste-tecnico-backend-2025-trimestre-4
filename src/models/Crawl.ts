import mongoose, { Schema, Document } from 'mongoose';

export type CrawlStatus = 'pending' | 'running' | 'finished' | 'failed';

export interface ICrawl extends Document {
  crawlId: string;
  cepStart: string;
  cepEnd: string;
  totalCeps: number;
  processed: number;
  successes: number;
  errorCount: number;
  status: CrawlStatus;
  createdAt: Date;
  updatedAt: Date;
}

const CrawlSchema = new Schema<ICrawl>(
  {
    crawlId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    cepStart: {
      type: String,
      required: true,
    },
    cepEnd: {
      type: String,
      required: true,
    },
    totalCeps: {
      type: Number,
      required: true,
    },
    processed: {
      type: Number,
      default: 0,
    },
    successes: {
      type: Number,
      default: 0,
    },
    errorCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'finished', 'failed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

export const Crawl = mongoose.model<ICrawl>('Crawl', CrawlSchema);
