import { RateLimit } from '../models/RateLimit.js';
import { hashToken } from './security.js';
import { AppError } from './errors.js';

// Mongo-backed counters remain shared when the API runs on multiple instances.
export function rateLimit({ scope, maximum, windowMs, key = (req) => req.ip }) {
  return async (req, res, next) => {
    const now = Date.now();
    const bucket = Math.floor(now / windowMs);
    const id = hashToken(`${scope}:${key(req)}:${bucket}`);
    const expiresAt = new Date((bucket + 1) * windowMs);
    let counter;
    try {
      counter = await RateLimit.findOneAndUpdate(
        { _id: id },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
        { upsert: true, returnDocument: 'after' },
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
      counter = await RateLimit.findOneAndUpdate(
        { _id: id },
        { $inc: { count: 1 } },
        { returnDocument: 'after' },
      );
    }
    if (counter.count > maximum) {
      res.set('Retry-After', String(Math.ceil((expiresAt.getTime() - now) / 1000)));
      throw new AppError(429, 'TOO_MANY_REQUESTS');
    }
    next();
  };
}
