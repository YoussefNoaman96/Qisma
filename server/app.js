import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { authRoutes } from './routes/auth.js';
import { splitRoutes } from './routes/splits.js';
import { AppError, errorHandler } from './middleware/errors.js';
import { originGuard } from './middleware/security.js';

export function createApp(config) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-origin' } }));
  app.use((req, res, next) => {
    req.id = randomUUID();
    res.set('X-Request-Id', req.id);
    if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/health', (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable' });
  });
  app.use('/api', originGuard(config), cookieParser());
  app.use('/api/auth', express.json({ limit: '8kb', strict: true }), authRoutes(config));
  app.use('/api/splits', express.json({ limit: 2_000_000, strict: true }), splitRoutes(config));
  app.use('/api', (_req, _res, next) => next(new AppError(404, 'NOT_FOUND')));
  if (config.nodeEnv === 'production') {
    const directory = fileURLToPath(new URL('../dist/', import.meta.url));
    app.use(
      express.static(directory, {
        index: 'index.html',
        maxAge: '1h',
        setHeaders: (res, file) => {
          if (file.endsWith('index.html')) res.set('Cache-Control', 'no-cache');
          else if (file.includes('/assets/') || file.includes('\\assets\\'))
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
        },
      }),
    );
  }
  app.use((_req, _res, next) => next(new AppError(404, 'NOT_FOUND')));
  app.use(errorHandler);
  return app;
}
