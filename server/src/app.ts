import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { AppConfig } from './env';
import type { Db } from './db';
import { healthRouter } from './routes/health';
import { syncRouter } from './routes/sync';
import { authRouter } from './routes/auth';
import { filesRouter } from './routes/files';
import { dashboardRouter } from './routes/dashboard';

export function createApp({ db, config }: { db: Db; config: AppConfig }) {
  const app = express();
  app.set('trust proxy', 1);

  const origins =
    config.corsOrigins === '*'
      ? true
      : config.corsOrigins
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean);
  app.use(cors({ origin: origins, credentials: true }));
  app.use(express.json({ limit: '40mb', type: ['application/json', 'text/plain'] }));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  app.use(healthRouter(db));
  app.use(syncRouter({ db, config }));
  app.use(authRouter(config));
  app.use(filesRouter({ db, config }));
  app.use(dashboardRouter({ db, config }));

  if (fs.existsSync(config.dashboardDir)) {
    app.use(
      express.static(config.dashboardDir, {
        index: false,
        maxAge: '1h',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
  }

  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) {
      next();
      return;
    }
    const indexFile = path.join(config.dashboardDir, 'index.html');
    if (fs.existsSync(indexFile)) {
      res.sendFile(indexFile);
      return;
    }
    res
      .status(404)
      .type('text')
      .send('Dashboard not built. Run: npm --prefix dashboard run build');
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
    void next;
    if (req.path === '/api/sync') {
      const message =
        isBodyError(error) && isTooLarge(error) ? 'Request too large' : 'Request failed';
      res.status(200).json({ ok: false, error: message });
      return;
    }
    if (isBodyError(error)) {
      res.status(isTooLarge(error) ? 413 : 400).json({
        error: isTooLarge(error) ? 'Request too large' : 'Bad request',
      });
      return;
    }
    console.error('Unhandled request error:', error);
    res.status(500).json({ error: 'Request failed' });
  });

  return app;
}

interface HttpError {
  type?: string;
  status?: number;
  statusCode?: number;
}

function isBodyError(error: unknown): error is HttpError {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as HttpError;
  return (
    candidate.type === 'entity.too.large' ||
    candidate.type === 'entity.parse.failed' ||
    candidate.status === 400 ||
    candidate.status === 413
  );
}

function isTooLarge(error: HttpError): boolean {
  return error.type === 'entity.too.large' || error.status === 413;
}
