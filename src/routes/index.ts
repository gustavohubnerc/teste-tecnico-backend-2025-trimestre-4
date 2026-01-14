import { Router } from 'express';
import cepRoutes from './cep.routes.js';

const router = Router();

router.use('/cep', cepRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
