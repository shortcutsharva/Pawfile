import { Router } from 'express';
import type { Db } from '../db';

export function healthRouter(db: Db): Router {
  const router = Router();
  router.get('/api/health', (_req, res) => {
    try {
      db.prepare('SELECT 1').get();
      res.json({ ok: true, service: 'pawfile-server' });
    } catch {
      res.status(503).json({ ok: false, error: 'Database unavailable' });
    }
  });
  return router;
}
