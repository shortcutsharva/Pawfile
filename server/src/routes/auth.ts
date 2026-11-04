import { Router } from 'express';
import type { AppConfig } from '../env';
import {
  clearLoginFailures,
  createSessionToken,
  expiredSessionCookie,
  isLoginRateLimited,
  parseCookies,
  recordLoginFailure,
  safeEqual,
  sessionCookie,
  verifySessionToken,
} from '../auth';

export function authRouter(config: AppConfig): Router {
  const router = Router();

  router.post('/api/auth/login', (req, res) => {
    const ip = req.ip ?? 'unknown';
    if (isLoginRateLimited(ip)) {
      res.status(429).json({ error: 'Too many attempts. Try again later.' });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const secret = typeof body.secret === 'string' ? body.secret.trim() : '';
    if (!secret || !safeEqual(secret, config.sharedSecret)) {
      recordLoginFailure(ip);
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    clearLoginFailures(ip);
    const secure = config.nodeEnv === 'production' || req.secure;
    res.setHeader(
      'Set-Cookie',
      sessionCookie(createSessionToken(config.sharedSecret), secure),
    );
    res.json({ ok: true });
  });

  router.post('/api/auth/logout', (req, res) => {
    const secure = config.nodeEnv === 'production' || req.secure;
    res.setHeader('Set-Cookie', expiredSessionCookie(secure));
    res.json({ ok: true });
  });

  router.get('/api/auth/session', (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    res.json({
      authenticated: verifySessionToken(config.sharedSecret, cookies.pawfile_session),
    });
  });

  return router;
}
