import fs from 'node:fs';
import { Router } from 'express';
import type { AppConfig } from '../env';
import type { Db } from '../db';
import { verifyFileToken } from '../auth';
import { getMediaFile, resolveStoredPath } from '../services/media';

export function filesRouter({ db, config }: { db: Db; config: AppConfig }): Router {
  const router = Router();

  router.get('/api/files/:fileId', (req, res) => {
    const fileId = req.params.fileId;
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!verifyFileToken(config.sharedSecret, fileId, token)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const file = getMediaFile(db, fileId);
    if (!file) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    let absolutePath: string;
    try {
      absolutePath = resolveStoredPath(config.uploadsDir, file.storedPath);
    } catch {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    if (!fs.existsSync(absolutePath)) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${file.fileName.replace(/"/g, '')}"`,
    );
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(absolutePath);
  });

  return router;
}
