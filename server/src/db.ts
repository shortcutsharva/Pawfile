import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { SHARED_TABLES_SQL } from '../../shared/schema';
import { SERVER_SCHEMA_SQL } from './schema';

export type Db = Database.Database;

export function openDatabase(filePath: string): Db {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');
  db.exec(SHARED_TABLES_SQL);
  db.exec(SERVER_SCHEMA_SQL);
  return db;
}
