import { getOne, run } from '@/db/client';
import { getTransport } from '@/data/transport';
import type { IdBlock } from '@/data/types';
import { nowISO } from '@/utils/date';

const BLOCK_SIZE = 50;
const FALLBACK_BASE = 900_000;

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(result);
}

async function readBlock(deviceId: string): Promise<IdBlock | null> {
  const row = await getOne<{
    deviceId: string;
    start: number;
    end: number;
    next: number;
    source: string;
    createdAt: string;
  }>('SELECT * FROM id_blocks WHERE deviceId = ?', [deviceId]);
  if (!row) return null;
  return {
    deviceId: row.deviceId,
    start: row.start,
    end: row.end,
    next: row.next,
    source: row.source as IdBlock['source'],
    createdAt: row.createdAt,
  };
}

async function saveBlock(block: IdBlock): Promise<void> {
  await run(
    'INSERT OR REPLACE INTO id_blocks (deviceId, start, end, next, source, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [block.deviceId, block.start, block.end, block.next, block.source, block.createdAt],
  );
}

async function newBlock(deviceId: string): Promise<IdBlock> {
  const transport = getTransport();
  if (transport.mode === 'remote') {
    try {
      const remote = await transport.allocateCaseIds(deviceId, BLOCK_SIZE);
      if (remote) {
        return {
          deviceId,
          start: remote.start,
          end: remote.end,
          next: remote.start,
          source: 'remote',
          createdAt: nowISO(),
        };
      }
    } catch {
      // Fall through to a device-scoped fallback range when offline.
    }
  }

  if (transport.mode === 'local') {
    const row = await getOne<{ maxId: number | null }>(
      'SELECT MAX(CAST(caseId AS INTEGER)) as maxId FROM cases',
    );
    const start = Math.max(1043, (row?.maxId ?? 0) + 1);
    return {
      deviceId,
      start,
      end: start + BLOCK_SIZE - 1,
      next: start,
      source: 'fallback',
      createdAt: nowISO(),
    };
  }

  const start = FALLBACK_BASE + (hash(deviceId) % 900) * 100 + 1;
  return {
    deviceId,
    start,
    end: start + 99,
    next: start,
    source: 'fallback',
    createdAt: nowISO(),
  };
}

export async function allocateCaseId(deviceId: string): Promise<string> {
  let block = await readBlock(deviceId);
  if (!block || block.next > block.end) {
    block = await newBlock(deviceId);
  }
  const id = block.next;
  block.next += 1;
  await saveBlock(block);
  return String(id);
}

export async function peekNextCaseId(deviceId: string): Promise<string | null> {
  const block = await readBlock(deviceId);
  if (!block || block.next > block.end) return null;
  return String(block.next);
}
