import { Router, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { crawlRequestSchema, paginationSchema } from '../validators/crawl.validator.js';
import { createCrawl, getCrawlStatus, getCrawlResults } from '../services/crawl.service.js';

const router = Router();

router.post('/crawl', async (req: Request, res: Response) => {
  try {
    const validatedData = crawlRequestSchema.parse(req.body);

    const crawlId = await createCrawl({
      cepStart: validatedData.cep_start,
      cepEnd: validatedData.cep_end,
    });

    res.status(202).json({
      message: 'Crawl request accepted',
      crawl_id: crawlId,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    console.error('Error creating crawl:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

router.get('/crawl/:crawl_id', async (req: Request, res: Response) => {
  try {
    const crawl_id = req.params.crawl_id as string;

    const status = await getCrawlStatus(crawl_id);

    if (!status) {
      res.status(404).json({
        error: 'Crawl not found',
        crawl_id,
      });
      return;
    }

    res.status(200).json(status);
  } catch (error) {
    console.error('Error getting crawl status:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

router.get('/crawl/:crawl_id/results', async (req: Request, res: Response) => {
  try {
    const crawl_id = req.params.crawl_id as string;

    const pagination = paginationSchema.parse(req.query);

    const results = await getCrawlResults(crawl_id, pagination.page, pagination.limit);

    if (!results) {
      res.status(404).json({
        error: 'Crawl not found',
        crawl_id,
      });
      return;
    }

    res.status(200).json(results);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    console.error('Error getting crawl results:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

export default router;
