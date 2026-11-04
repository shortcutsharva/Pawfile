import fs from 'node:fs';
import path from 'node:path';
import type { Db } from '../db';
import { istDateKey } from './dates';

const KEEP_BACKUPS = 7;

export function runBackupIfDue(
  db: Db,
  databasePath: string,
  now = new Date(),
): string | null {
  const backupsDir = path.join(path.dirname(databasePath), 'backups');
  const target = path.join(backupsDir, `pawfile-${istDateKey(now)}.db`);
  if (fs.existsSync(target)) return null;

  fs.mkdirSync(backupsDir, { recursive: true });
  db.prepare('VACUUM INTO ?').run(target);

  const files = fs
    .readdirSync(backupsDir)
    .filter((file) => /^pawfile-\d{4}-\d{2}-\d{2}\.db$/.test(file))
    .sort();
  for (const file of files.slice(0, Math.max(0, files.length - KEEP_BACKUPS))) {
    fs.rmSync(path.join(backupsDir, file), { force: true });
  }
  return target;
}
