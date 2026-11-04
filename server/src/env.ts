import path from 'node:path';
import { z } from 'zod';

const serverRoot = path.resolve(import.meta.dirname, '..');

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().min(1).default('0.0.0.0'),
  APP_SHARED_SECRET: z.string().min(16, 'APP_SHARED_SECRET must be at least 16 characters.'),
  DATABASE_PATH: z.string().min(1).default('./data/pawfile.db'),
  UPLOADS_DIR: z.string().min(1).default('./data/uploads'),
  DASHBOARD_DIR: z.string().min(1).optional(),
  CORS_ORIGINS: z.string().default('*'),
  TZ: z.string().default('Asia/Kolkata'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export interface AppConfig {
  port: number;
  host: string;
  sharedSecret: string;
  databasePath: string;
  uploadsDir: string;
  dashboardDir: string;
  corsOrigins: string;
  timeZone: string;
  nodeEnv: 'development' | 'production' | 'test';
  maxUploadBytes: number;
}

function resolveFromServerRoot(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(serverRoot, value);
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(source);
  return {
    port: parsed.PORT,
    host: parsed.HOST,
    sharedSecret: parsed.APP_SHARED_SECRET,
    databasePath: resolveFromServerRoot(parsed.DATABASE_PATH),
    uploadsDir: resolveFromServerRoot(parsed.UPLOADS_DIR),
    dashboardDir: resolveFromServerRoot(
      parsed.DASHBOARD_DIR ?? path.join(serverRoot, '..', 'dashboard', 'dist'),
    ),
    corsOrigins: parsed.CORS_ORIGINS,
    timeZone: parsed.TZ,
    nodeEnv: parsed.NODE_ENV,
    maxUploadBytes: 25 * 1024 * 1024,
  };
}
