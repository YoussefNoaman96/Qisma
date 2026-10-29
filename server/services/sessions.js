import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { hashToken, verifyCsrf } from '../middleware/security.js';
import { AppError } from '../middleware/errors.js';

const ACCESS_SECONDS = 15 * 60;
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const tokenOptions = {
  algorithm: 'HS256',
  issuer: 'expense-splitter',
  audience: 'expense-splitter-web',
};
export const publicUser = (user) => ({ id: String(user._id), name: user.name, email: user.email });

function cookieOptions(config) {
  return { httpOnly: true, secure: config.secureCookies, sameSite: 'strict', path: '/' };
}

export function clearAuthCookies(res, config) {
  res.clearCookie('access_token', cookieOptions(config));
  res.clearCookie('refresh_token', cookieOptions(config));
  res.clearCookie('csrf_token', { ...cookieOptions(config), httpOnly: false });
}

function setAccessCookie(res, session, config) {
  const token = jwt.sign({ sid: String(session._id) }, config.jwtSecret, {
    ...tokenOptions,
    subject: String(session.userId),
    expiresIn: ACCESS_SECONDS,
  });
  res.cookie('access_token', token, { ...cookieOptions(config), maxAge: ACCESS_SECONDS * 1000 });
}

export async function createSession(user, res, config) {
  const id = new mongoose.Types.ObjectId();
  const refresh = `${id}.${randomBytes(32).toString('hex')}`;
  const csrf = randomBytes(32).toString('hex');
  const session = await Session.create({
    _id: id,
    userId: user._id,
    refreshHash: hashToken(refresh),
    csrfHash: hashToken(csrf),
    expiresAt: new Date(Date.now() + SESSION_MS),
  });
  setAccessCookie(res, session, config);
  res.cookie('refresh_token', refresh, { ...cookieOptions(config), maxAge: SESSION_MS });
  res.cookie('csrf_token', csrf, { ...cookieOptions(config), httpOnly: false, maxAge: SESSION_MS });
}

export function requireAuth(config) {
  return async (req, _res, next) => {
    let claims;
    try {
      claims = jwt.verify(req.cookies.access_token || '', config.jwtSecret, {
        algorithms: ['HS256'],
        issuer: tokenOptions.issuer,
        audience: tokenOptions.audience,
      });
    } catch {
      throw new AppError(401, 'UNAUTHENTICATED');
    }
    if (
      !claims ||
      typeof claims !== 'object' ||
      !mongoose.isObjectIdOrHexString(claims.sub) ||
      !mongoose.isObjectIdOrHexString(claims.sid)
    )
      throw new AppError(401, 'UNAUTHENTICATED');
    const session = await Session.findOne({
      _id: claims.sid,
      userId: claims.sub,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!session) throw new AppError(401, 'UNAUTHENTICATED');
    const user = await User.findById(claims.sub);
    if (!user) throw new AppError(401, 'UNAUTHENTICATED');
    if (!['GET', 'HEAD'].includes(req.method)) verifyCsrf(req, session);
    req.auth = { user, session };
    next();
  };
}

export async function findRefreshSession(req, forLogout = false) {
  const refresh = req.cookies.refresh_token;
  if (typeof refresh !== 'string' || !/^[a-f0-9]{24}\.[a-f0-9]{64}$/u.test(refresh))
    throw new AppError(401, 'UNAUTHENTICATED');
  const session = await Session.findOne({
    _id: refresh.split('.')[0],
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!session) throw new AppError(401, 'UNAUTHENTICATED');
  verifyCsrf(req, session);
  const hash = hashToken(refresh);
  if (session.refreshHash !== hash) {
    const previous = session.previousTokens.find((token) => token.hash === hash);
    if (forLogout && previous) return { session, hash };
    if (previous && Date.now() - previous.usedAt.getTime() < 5000)
      throw new AppError(409, 'REFRESH_RETRY');
    if (previous) await Session.updateOne({ _id: session._id }, { revokedAt: new Date() });
    throw new AppError(401, 'UNAUTHENTICATED');
  }
  return { session, hash };
}

export async function refreshSession(req, res, config) {
  const { session, hash } = await findRefreshSession(req);
  // Keep replay history bounded without discarding hashes of still-valid old tokens.
  if (session.previousTokens.length >= 1024) {
    await Session.updateOne({ _id: session._id }, { revokedAt: new Date() });
    throw new AppError(401, 'UNAUTHENTICATED');
  }
  const refresh = `${session._id}.${randomBytes(32).toString('hex')}`;
  // Compare-and-swap ensures one old refresh token can rotate only once.
  const updated = await Session.findOneAndUpdate(
    { _id: session._id, refreshHash: hash, revokedAt: null },
    {
      $set: { refreshHash: hashToken(refresh) },
      $push: { previousTokens: { hash, usedAt: new Date() } },
    },
    { returnDocument: 'after' },
  );
  if (!updated) throw new AppError(409, 'REFRESH_RETRY');
  const user = await User.findById(session.userId);
  if (!user) throw new AppError(401, 'UNAUTHENTICATED');
  setAccessCookie(res, updated, config);
  res.cookie('refresh_token', refresh, {
    ...cookieOptions(config),
    maxAge: Math.max(0, updated.expiresAt.getTime() - Date.now()),
  });
  return publicUser(user);
}
