import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';

const DATABASE_NAME = 'animal-welfare.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version >= SCHEMA_VERSION) return;

  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(SCHEMA_SQL);
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
  }
  return databasePromise;
}

export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM cases;
    DELETE FROM actions;
    DELETE FROM hearings;
    DELETE FROM contacts;
    DELETE FROM documents;
    DELETE FROM history;
    DELETE FROM outbound_queue;
    DELETE FROM id_blocks;
    DELETE FROM draft_media;
    DELETE FROM settings;
    DELETE FROM sync_metadata;
    DELETE FROM config;
  `);
}

export async function getAll<T>(sql: string, params: SQLite.SQLiteBindParams = []): Promise<T[]> {
  const db = await getDb();
  return db.getAllAsync<T>(sql, params);
}

export async function getOne<T>(sql: string, params: SQLite.SQLiteBindParams = []): Promise<T | null> {
  const db = await getDb();
  return db.getFirstAsync<T>(sql, params);
}

export async function run(sql: string, params: SQLite.SQLiteBindParams = []): Promise<void> {
  const db = await getDb();
  await db.runAsync(sql, params);
}
