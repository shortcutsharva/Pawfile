import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const SESSION_COOKIE = 'pawfile_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function safeEqual(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

function sessionKey(secret: string): Buffer {
  return createHmac('sha256', secret).update('pawfile-session').digest();
}

function fileKey(secret: string): Buffer {
  return createHmac('sha256', secret).update('pawfile-file').digest();
}

export function createSessionToken(secret: string, now = Date.now()): string {
  const expiresAt = now + SESSION_TTL_MS;
  const signature = createHmac('sha256', sessionKey(secret))
    .update(String(expiresAt))
    .digest('base64url');
  return `${expiresAt}.${signature}`;
}

export function verifySessionToken(secret: string, token: string | undefined): boolean {
  if (!token) return false;
  const separator = token.indexOf('.');
  if (separator <= 0) return false;
  const expiresAt = Number(token.slice(0, separator));
  const signature = token.slice(separator + 1);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
  const expected = createHmac('sha256', sessionKey(secret))
    .update(String(expiresAt))
    .digest('base64url');
  return safeEqual(signature, expected);
}

export function createFileToken(secret: string, fileId: string): string {
  return createHmac('sha256', fileKey(secret)).update(fileId).digest('base64url');
}

export function verifyFileToken(secret: string, fileId: string, token: string | undefined): boolean {
  if (!token) return false;
  return safeEqual(token, createFileToken(secret, fileId));
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!name) continue;
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

export function sessionCookie(token: string, secure: boolean): string {
  const base = `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
    SESSION_TTL_MS / 1000
  }`;
  return secure ? `${base}; Secure` : base;
}

export function expiredSessionCookie(secure: boolean): string {
  const base = `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  return secure ? `${base}; Secure` : base;
}

export function requestSecret(req: Request): string {
  const header = req.headers['x-api-secret'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim();
  const body = req.body as Record<string, unknown> | undefined;
  if (typeof body?.secret === 'string') return body.secret.trim();
  return '';
}

interface LoginAttempt {
  count: number;
  resetAt: number;
}

const loginAttempts = new Map<string, LoginAttempt>();

export function isLoginRateLimited(ip: string, now = Date.now()): boolean {
  const attempt = loginAttempts.get(ip);
  if (!attempt) return false;
  if (attempt.resetAt <= now) {
    loginAttempts.delete(ip);
    return false;
  }
  return attempt.count >= LOGIN_MAX_ATTEMPTS;
}

export function recordLoginFailure(ip: string, now = Date.now()): void {
  const attempt = loginAttempts.get(ip);
  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  attempt.count += 1;
}

export function clearLoginFailures(ip: string): void {
  loginAttempts.delete(ip);
}

export function resetLoginAttempts(): void {
  loginAttempts.clear();
}

export function requireDashboardSession(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const cookies = parseCookies(req.headers.cookie);
    if (!verifySessionToken(secret, cookies[SESSION_COOKIE])) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  };
}
