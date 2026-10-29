import { createHash, timingSafeEqual } from 'node:crypto';
import { AppError } from './errors.js';

export const hashToken = (value) => createHash('sha256').update(value).digest('hex');

export function verifyCsrf(req, session) {
  const value = req.get('X-CSRF-Token');
  if (typeof value !== 'string' || value.length > 128) throw new AppError(403, 'CSRF_INVALID');
  const provided = Buffer.from(hashToken(value));
  const expected = Buffer.from(session.csrfHash);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new AppError(403, 'CSRF_INVALID');
  }
}

export function originGuard(config) {
  const allowedOrigins = new Set([config.appOrigin]);
  const origin = new URL(config.appOrigin);
  // Local development may use either loopback hostname, but never another port.
  if (
    config.nodeEnv === 'development' &&
    origin.protocol === 'http:' &&
    ['127.0.0.1', 'localhost'].includes(origin.hostname)
  ) {
    origin.hostname = origin.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    allowedOrigins.add(origin.origin);
  }
  return (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    // JSON plus an explicit allowed Origin blocks cross-site form submissions and login CSRF.
    if (!allowedOrigins.has(req.get('Origin'))) return next(new AppError(403, 'ORIGIN_DENIED'));
    if (
      req.headers['content-length'] !== '0' &&
      req.headers['content-length'] !== undefined &&
      !req.is('application/json')
    ) {
      return next(new AppError(415, 'JSON_REQUIRED'));
    }
    next();
  };
}
