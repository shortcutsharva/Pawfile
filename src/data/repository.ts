import { getAll, getOne, run } from '@/db/client';
import { OutboundQueue } from '@/data/queue/OutboundQueue';
import type { SheetName } from '@/data/types';

export interface SyncEntity {
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
  localVersion: number;
  serverVersion: number;
  isDeleted: boolean;
}

export type Row = Record<string, unknown>;

export interface RepositoryOptions<T> {
  table: string;
  idField: keyof T & string;
  sheet: SheetName;
  rowToEntity: (row: Row) => T;
  entityToRow: (entity: T) => Row;
}

const listeners = new Set<(table: string) => void>();

export function subscribeRepository(listener: (table: string) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(table: string): void {
  listeners.forEach((listener) => listener(table));
}

export function notifyTable(table: string): void {
  notify(table);
}

export class SqliteRepository<T extends SyncEntity> {
  constructor(protected readonly options: RepositoryOptions<T>) {}

  protected get idField(): string {
    return this.options.idField;
  }

  protected id(entity: T): string {
    return String((entity as Record<string, unknown>)[this.idField]);
  }

  async getAll(includeDeleted = false): Promise<T[]> {
    const where = includeDeleted ? '' : 'WHERE isDeleted = 0';
    const rows = await getAll<Row>(
      `SELECT * FROM ${this.options.table} ${where} ORDER BY updatedAt DESC`,
    );
    return rows.map((row) => this.options.rowToEntity(row));
  }

  async getById(id: string): Promise<T | null> {
    const row = await getOne<Row>(
      `SELECT * FROM ${this.options.table} WHERE ${this.idField} = ?`,
      [id],
    );
    return row ? this.options.rowToEntity(row) : null;
  }

  async insert(entity: T, queue = true): Promise<T> {
    const row = this.options.entityToRow(entity);
    const columns = Object.keys(row);
    const placeholders = columns.map(() => '?').join(', ');
    await run(
      `INSERT OR REPLACE INTO ${this.options.table} (${columns.join(', ')}) VALUES (${placeholders})`,
      columns.map((column) => row[column] as never),
    );
    if (queue) {
      await OutboundQueue.enqueue(this.options.sheet, 'create', this.id(entity), entity);
    }
    notify(this.options.table);
    return entity;
  }

  async update(id: string, patch: Partial<T>, queue = true): Promise<T> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`${this.options.table}: ${id} not found`);
    const merged = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
      localVersion: (existing.localVersion ?? 0) + 1,
      syncedAt: null,
    } as T;
    const row = this.options.entityToRow(merged);
    const columns = Object.keys(row).filter((column) => column !== this.idField);
    const assignments = columns.map((column) => `${column} = ?`).join(', ');
    await run(
      `UPDATE ${this.options.table} SET ${assignments} WHERE ${this.idField} = ?`,
      [...columns.map((column) => row[column] as never), id],
    );
    if (queue) {
      await OutboundQueue.enqueue(this.options.sheet, 'update', id, merged);
    }
    notify(this.options.table);
    return merged;
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) return;
    const merged = {
      ...existing,
      isDeleted: true,
      updatedAt: new Date().toISOString(),
      localVersion: (existing.localVersion ?? 0) + 1,
      syncedAt: null,
    } as T;
    const row = this.options.entityToRow(merged);
    const columns = Object.keys(row).filter((column) => column !== this.idField);
    const assignments = columns.map((column) => `${column} = ?`).join(', ');
    await run(
      `UPDATE ${this.options.table} SET ${assignments} WHERE ${this.idField} = ?`,
      [...columns.map((column) => row[column] as never), id],
    );
    await OutboundQueue.enqueue(this.options.sheet, 'delete', id, merged);
    notify(this.options.table);
  }

  async applyRemote(entity: T): Promise<void> {
    const row = this.options.entityToRow(entity);
    const columns = Object.keys(row);
    const placeholders = columns.map(() => '?').join(', ');
    await run(
      `INSERT OR REPLACE INTO ${this.options.table} (${columns.join(', ')}) VALUES (${placeholders})`,
      columns.map((column) => row[column] as never),
    );
    notify(this.options.table);
  }

  fromRow(row: Row): T {
    return this.options.rowToEntity(row);
  }

  async applyRemoteRow(row: Row): Promise<T> {
    const entity = this.fromRow(row);
    await this.applyRemote(entity);
    return entity;
  }

  async markSynced(id: string, serverVersion: number): Promise<void> {
    await run(
      `UPDATE ${this.options.table} SET syncedAt = ?, serverVersion = ? WHERE ${this.idField} = ?`,
      [new Date().toISOString(), serverVersion, id],
    );
    notify(this.options.table);
  }

  protected emit(): void {
    notify(this.options.table);
  }
}

export function bool(value: unknown): boolean {
  return value === 1 || value === true || value === '1' || value === 'TRUE' || value === 'true';
}

export function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function str(value: unknown, fallback = ''): string {
  return value === null || value === undefined ? fallback : String(value);
}

export function boolInt(value: boolean): number {
  return value ? 1 : 0;
}
