import express from 'express';
import { env, connectDatabase, ensureQueueExists } from './config/index.js';
import routes from './routes/index.js';

const app = express();

// Middlewares
app.use(express.json());

// Routes
app.use(routes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Ensure SQS queue exists
    await ensureQueueExists();

    // Start server
    app.listen(env.PORT, () => {
      console.log(`API server running on port ${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Max CEP range: ${env.MAX_CEP_RANGE}`);
    });
  } catch (error) {
    console.error('Failed to start API server:', error);
    process.exit(1);
  }
}

start();
