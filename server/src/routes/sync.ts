import { Router } from 'express';
import { z } from 'zod';
import { SHARED_SCHEMA_VERSION } from '../../../shared/schema';
import type { AppConfig } from '../env';
import type { Db } from '../db';
import { requestSecret, safeEqual } from '../auth';
import { SHEET_NAMES } from '../tables';
import { pullRows } from '../services/pull';
import { pushRows } from '../services/push';
import { allocateBlock } from '../services/ids';
import { ALLOWED_MEDIA_CATEGORIES, saveUpload } from '../services/media';
import { nowISO } from '../services/dates';

const rowSchema = z.record(z.string(), z.unknown());
const secretSchema = z.object({ secret: z.string().optional() });

const requestSchema = z.discriminatedUnion('action', [
  secretSchema.extend({ action: z.literal('health') }),
  secretSchema.extend({
    action: z.literal('pull'),
    sheet: z.enum(SHEET_NAMES),
    since: z.string().datetime().nullable().optional(),
  }),
  secretSchema.extend({
    action: z.literal('push'),
    sheet: z.enum(SHEET_NAMES),
    rows: z.array(rowSchema).max(500),
  }),
  secretSchema.extend({
    action: z.literal('allocateBlock'),
    deviceId: z.string().min(1).max(128),
    size: z.number().int().min(1).max(500).default(50),
  }),
  secretSchema.extend({
    action: z.literal('uploadMedia'),
    caseId: z.string().regex(/^[A-Za-z0-9_-]{1,32}$/),
    category: z.enum(ALLOWED_MEDIA_CATEGORIES),
    fileName: z.string().min(1).max(255),
    mimeType: z.string().min(1),
    base64: z.string().min(1),
  }),
]);

export function syncRouter({ db, config }: { db: Db; config: AppConfig }): Router {
  const router = Router();

  router.post('/api/sync', (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const secret = requestSecret(req);
      if (!secret || !safeEqual(secret, config.sharedSecret)) {
        res.json({ ok: false, error: 'Unauthorized' });
        return;
      }

      const parsed = requestSchema.safeParse(body);
      if (!parsed.success) {
        res.json({ ok: false, error: 'Bad request' });
        return;
      }
      const request = parsed.data;

      switch (request.action) {
        case 'health':
          res.json({
            ok: true,
            service: 'pawfile-server',
            time: nowISO(),
            schemaVersion: SHARED_SCHEMA_VERSION,
          });
          return;
        case 'pull':
          res.json({
            ok: true,
            rows: pullRows(db, request.sheet, request.since),
            serverTime: nowISO(),
          });
          return;
        case 'push': {
          const result = pushRows(db, request.sheet, request.rows);
          res.json({ ok: true, ...result, serverTime: nowISO() });
          return;
        }
        case 'allocateBlock':
          res.json({ ok: true, block: allocateBlock(db, request.deviceId, request.size) });
          return;
        case 'uploadMedia':
          res.json({
            ok: true,
            file: saveUpload(
              db,
              config.uploadsDir,
              config.sharedSecret,
              request,
              config.maxUploadBytes,
            ),
          });
          return;
        default:
          res.json({ ok: false, error: 'Unknown action' });
      }
    } catch (error) {
      if (config.nodeEnv !== 'test') {
        console.error('Sync request failed:', error);
      }
      const message = error instanceof Error ? error.message : '';
      const known = [
        'Invalid caseId',
        'Unsupported file type',
        'Missing file data',
        'Invalid file data',
        'File is too large',
      ];
      res.json({
        ok: false,
        error: known.includes(message) ? message : 'Request failed',
      });
    }
  });

  return router;
}
