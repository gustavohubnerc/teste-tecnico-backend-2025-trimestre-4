import { z } from 'zod';
import { env } from '../config/env.js';

const cepRegex = /^\d{8}$/;

export const crawlRequestSchema = z
  .object({
    cep_start: z
      .string()
      .regex(cepRegex, 'CEP deve conter exatamente 8 dígitos numéricos'),
    cep_end: z
      .string()
      .regex(cepRegex, 'CEP deve conter exatamente 8 dígitos numéricos'),
  })
  .refine(
    (data) => {
      const start = parseInt(data.cep_start, 10);
      const end = parseInt(data.cep_end, 10);
      return start <= end;
    },
    {
      message: 'cep_start deve ser menor ou igual a cep_end',
      path: ['cep_start'],
    }
  )
  .refine(
    (data) => {
      const start = parseInt(data.cep_start, 10);
      const end = parseInt(data.cep_end, 10);
      const range = end - start + 1;
      return range <= env.MAX_CEP_RANGE;
    },
    {
      message: `O range máximo permitido é de ${env.MAX_CEP_RANGE} CEPs`,
      path: ['cep_end'],
    }
  );

export type CrawlRequest = z.infer<typeof crawlRequestSchema>;

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().min(1).max(100)),
});

export type PaginationParams = z.infer<typeof paginationSchema>;
