import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app';
import type { AppConfig } from '../env';
import { openDatabase, type Db } from '../db';
import { assertSchema } from '../schemaAssert';
import { resetLoginAttempts } from '../auth';

export const TEST_SECRET = 'test-secret-0123456789';

export interface TestContext {
  db: Db;
  config: AppConfig;
  baseUrl: string;
  close: () => Promise<void>;
}

export async function createTestContext(
  overrides: Partial<AppConfig> = {},
): Promise<TestContext> {
  resetLoginAttempts();
  const directory = mkdtempSync(path.join(tmpdir(), 'pawfile-test-'));
  const databasePath = path.join(directory, 'pawfile.db');
  const db = openDatabase(databasePath);
  assertSchema(db);
  const config: AppConfig = {
    port: 0,
    host: '127.0.0.1',
    sharedSecret: TEST_SECRET,
    databasePath,
    uploadsDir: path.join(directory, 'uploads'),
    dashboardDir: path.join(directory, 'dashboard'),
    corsOrigins: '*',
    timeZone: 'Asia/Kolkata',
    nodeEnv: 'test',
    maxUploadBytes: 1024 * 1024,
    ...overrides,
  };
  const app = createApp({ db, config });
  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const { port } = server.address() as AddressInfo;

  return {
    db,
    config,
    baseUrl: `http://127.0.0.1:${port}`,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      db.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

export async function postSync(
  context: TestContext,
  body: Record<string, unknown>,
  secret = TEST_SECRET,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const response = await fetch(`${context.baseUrl}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-secret': secret },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: (await response.json()) as Record<string, unknown> };
}

export async function login(context: TestContext, secret = TEST_SECRET): Promise<string> {
  const response = await fetch(`${context.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret }),
  });
  const cookies = response.headers.getSetCookie?.() ?? [];
  const raw = cookies[0] ?? response.headers.get('set-cookie') ?? '';
  return raw.split(';')[0] ?? '';
}

export async function getJson(
  context: TestContext,
  pathname: string,
  cookie?: string,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const response = await fetch(`${context.baseUrl}${pathname}`, {
    headers: cookie ? { cookie } : undefined,
  });
  return { status: response.status, json: (await response.json()) as Record<string, unknown> };
}

export function caseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    caseId: '1043',
    title: 'Injured dog',
    animalType: 'Dog',
    complaintCategory: 'Injury',
    description: 'Found near the market',
    state: 'Karnataka',
    district: 'Bengaluru',
    locationText: 'Market road',
    locationLat: null,
    locationLng: null,
    complaintSource: 'Phone',
    complainantName: 'Test Complainant',
    complainantPhone: '9999999999',
    status: 'open',
    rescueStatus: 'na',
    legalStatus: 'na',
    urgency: 'High',
    createdAt: '2026-11-04T00:00:00.000Z',
    updatedAt: '2026-11-04T00:00:00.000Z',
    syncedAt: null,
    localVersion: 1,
    serverVersion: 0,
    isDeleted: false,
    ...overrides,
  };
}

export function actionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    actionId: 'ACT-1043-1',
    caseId: '1043',
    type: 'rescue',
    actionStatus: 'to_attend',
    rescueStatus: 'to_attend',
    legalStatus: 'na',
    assignedToId: 'self',
    assignedToName: 'Self',
    followUpById: 'self',
    followUpByName: 'Self',
    nextAction: 'Visit the spot',
    followUpDate: '2026-11-01T09:00:00.000Z',
    dueValue: '2026-11-01T09:00:00.000Z',
    isClosed: false,
    closedAt: null,
    closedReason: '',
    animalCondition: '',
    outcome: '',
    policeStation: '',
    complaintDate: null,
    firNumber: '',
    firDate: null,
    investigatingOfficerId: '',
    investigatingOfficerName: '',
    court: '',
    courtCaseNumber: '',
    createdAt: '2026-11-04T00:00:00.000Z',
    updatedAt: '2026-11-04T00:00:00.000Z',
    syncedAt: null,
    localVersion: 1,
    serverVersion: 0,
    isDeleted: false,
    ...overrides,
  };
}

export function hearingRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    hearingId: 'HRG-1043-1',
    caseId: '1043',
    actionId: 'ACT-1043-1',
    date: '2026-11-12',
    time: '10:30',
    court: 'City Court',
    purpose: 'First hearing',
    attendeeId: 'self',
    attendeeName: 'Self',
    outcome: '',
    result: '',
    nextHearingDate: null,
    status: 'scheduled',
    reminder7d: true,
    reminder3d: true,
    reminder1d: true,
    createdAt: '2026-11-04T00:00:00.000Z',
    updatedAt: '2026-11-04T00:00:00.000Z',
    syncedAt: null,
    localVersion: 1,
    serverVersion: 0,
    isDeleted: false,
    ...overrides,
  };
}
