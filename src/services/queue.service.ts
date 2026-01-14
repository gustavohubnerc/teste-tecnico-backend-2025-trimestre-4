import {
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  SendMessageBatchCommand,
  type Message,
} from '@aws-sdk/client-sqs';
import { sqsClient } from '../config/queue.js';
import { env } from '../config/env.js';

export interface CepMessage {
  crawlId: string;
  cep: string;
  attempt: number;
}

export async function sendCepToQueue(message: CepMessage): Promise<void> {
  const command = new SendMessageCommand({
    QueueUrl: env.SQS_QUEUE_URL,
    MessageBody: JSON.stringify(message),
  });

  await sqsClient.send(command);
}

export async function sendCepBatchToQueue(messages: CepMessage[]): Promise<void> {
  const batchSize = 10;

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);

    const command = new SendMessageBatchCommand({
      QueueUrl: env.SQS_QUEUE_URL,
      Entries: batch.map((msg, index) => ({
        Id: `${i + index}`,
        MessageBody: JSON.stringify(msg),
      })),
    });

    await sqsClient.send(command);
  }
}

export async function receiveMessage(): Promise<Message | null> {
  const command = new ReceiveMessageCommand({
    QueueUrl: env.SQS_QUEUE_URL,
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 10,
    VisibilityTimeout: 60,
  });

  const response = await sqsClient.send(command);

  if (!response.Messages || response.Messages.length === 0) {
    return null;
  }

  return response.Messages[0];
}

export async function deleteMessage(receiptHandle: string): Promise<void> {
  const command = new DeleteMessageCommand({
    QueueUrl: env.SQS_QUEUE_URL,
    ReceiptHandle: receiptHandle,
  });

  await sqsClient.send(command);
}

export function parseMessageBody(body: string): CepMessage {
  return JSON.parse(body) as CepMessage;
}
