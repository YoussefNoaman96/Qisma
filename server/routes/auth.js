import { Router } from 'express';
import { loginSchema, registerSchema } from '../../shared/authSchemas.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { AppError } from '../middleware/errors.js';
import { hashPassword, verifyPassword } from '../services/passwords.js';
import {
  clearAuthCookies,
  createSession,
  findRefreshSession,
  publicUser,
  refreshSession,
  requireAuth,
} from '../services/sessions.js';

export function authRoutes(config) {
  const router = Router();
  const protect = requireAuth(config);
  router.post(
    '/register',
    rateLimit({ scope: 'register', maximum: 10, windowMs: 60 * 60 * 1000 }),
    validate(registerSchema),
    async (req, res) => {
      const { name, email, password } = req.validated;
      if (await User.exists({ email })) throw new AppError(409, 'REGISTRATION_FAILED');
      let user;
      try {
        user = await User.create({ name, email, passwordHash: await hashPassword(password) });
      } catch (error) {
        if (error.code === 11000) throw new AppError(409, 'REGISTRATION_FAILED');
        throw error;
      }
      await createSession(user, res, config);
      res.status(201).json({ user: publicUser(user) });
    },
  );
  router.post(
    '/login',
    rateLimit({ scope: 'login-ip', maximum: 60, windowMs: 15 * 60 * 1000 }),
    rateLimit({
      scope: 'login-email',
      maximum: 10,
      windowMs: 15 * 60 * 1000,
      key: (req) =>
        typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'invalid',
    }),
    validate(loginSchema),
    async (req, res) => {
      const { email, password } = req.validated;
      const user = await User.findOne({ email }).select('+passwordHash');
      const valid = await verifyPassword(user?.passwordHash, password);
      if (!user || !valid) throw new AppError(401, 'INVALID_CREDENTIALS');
      await createSession(user, res, config);
      res.json({ user: publicUser(user) });
    },
  );
  router.get('/session', protect, (req, res) => res.json({ user: publicUser(req.auth.user) }));
  router.post(
    '/refresh',
    rateLimit({ scope: 'refresh', maximum: 120, windowMs: 60 * 1000 }),
    async (req, res) => {
      try {
        res.json({ user: await refreshSession(req, res, config) });
      } catch (error) {
        if (error.status === 401) clearAuthCookies(res, config);
        throw error;
      }
    },
  );
  router.post('/logout', async (req, res) => {
    try {
      const { session } = await findRefreshSession(req, true);
      await Session.updateOne({ _id: session._id }, { revokedAt: new Date() });
    } catch (error) {
      if (error.status !== 401 && error.code !== 'REFRESH_RETRY') throw error;
    }
    clearAuthCookies(res, config);
    res.status(204).end();
  });
  router.post('/logout-all', protect, async (req, res) => {
    await Session.updateMany(
      { userId: req.auth.user._id, revokedAt: null },
      { revokedAt: new Date() },
    );
    clearAuthCookies(res, config);
    res.status(204).end();
  });
  return router;
}
