import { createHash, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { Split } from '../models/Split.js';
import { splitSignature } from '../../shared/splitSignature.js';
import { AppError } from '../middleware/errors.js';

const fingerprint = (group) => createHash('sha256').update(splitSignature(group)).digest('hex');
const publicSplit = (split) => ({
  id: split.id,
  savedAt: new Date(split.savedAt).toISOString(),
  members: split.members.map(({ id, name }) => ({ id, name })),
  expenses: split.expenses.map(({ id, amount, payerId, description, createdAt }) => ({
    id,
    amount,
    payerId,
    description,
    createdAt,
  })),
});

export async function saveSplit(ownerId, group) {
  const hash = fingerprint(group);
  let split = await Split.findOne({ ownerId, fingerprint: hash });
  if (split) return { split: publicSplit(split), created: false };
  try {
    split = await Split.create({
      ...group,
      ownerId,
      fingerprint: hash,
      id: randomUUID(),
      savedAt: new Date(),
    });
    return { split: publicSplit(split), created: true };
  } catch (error) {
    if (error.code !== 11000) throw error;
    split = await Split.findOne({ ownerId, fingerprint: hash });
    if (!split) throw error;
    return { split: publicSplit(split), created: false };
  }
}

function decodeCursor(value) {
  if (!value) return null;
  try {
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString());
    if (!mongoose.isObjectIdOrHexString(cursor.id) || !Number.isFinite(Date.parse(cursor.date)))
      throw new Error();
    return { _id: new mongoose.Types.ObjectId(cursor.id), savedAt: new Date(cursor.date) };
  } catch {
    throw new AppError(400, 'INVALID_CURSOR');
  }
}

export async function listSplits(ownerId, { cursor: raw, limit = 20 }) {
  const cursor = decodeCursor(raw);
  const filter = { ownerId };
  if (cursor)
    filter.$or = [
      { savedAt: { $lt: cursor.savedAt } },
      { savedAt: cursor.savedAt, _id: { $lt: cursor._id } },
    ];
  const [found, total] = await Promise.all([
    Split.find(filter)
      .sort({ savedAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean(),
    Split.countDocuments({ ownerId }),
  ]);
  const page = found.slice(0, limit);
  const last = page.at(-1);
  const nextCursor =
    found.length > limit
      ? Buffer.from(
          JSON.stringify({ id: String(last._id), date: last.savedAt.toISOString() }),
        ).toString('base64url')
      : null;
  return { records: page.map(publicSplit), total, nextCursor };
}

export async function getSplit(ownerId, id) {
  const split = await Split.findOne({ ownerId, id }).lean();
  if (!split) throw new AppError(404, 'SPLIT_NOT_FOUND');
  return publicSplit(split);
}

export async function exportSplits(ownerId) {
  const splits = await Split.find({ ownerId }).sort({ savedAt: -1, _id: -1 }).limit(501).lean();
  const data = { version: 1, splits: splits.map(publicSplit) };
  if (splits.length > 500 || Buffer.byteLength(JSON.stringify(data)) > 2_000_000)
    throw new AppError(413, 'EXPORT_TOO_LARGE');
  return data;
}

export async function importSplits(ownerId, splits) {
  let imported = 0;
  // Atlas supports transactions: a conflict cannot leave half an import saved.
  await mongoose.connection.transaction(async (session) => {
    imported = 0;
    const existing = await Split.find({
      ownerId,
      $or: [
        { id: { $in: splits.map((split) => split.id) } },
        { fingerprint: { $in: splits.map(fingerprint) } },
      ],
    })
      .session(session)
      .lean();
    const ids = new Map(existing.map((split) => [split.id, split.fingerprint]));
    const hashes = new Set(existing.map((split) => split.fingerprint));
    const incoming = [];
    for (const split of splits) {
      const hash = fingerprint(split);
      if (ids.has(split.id) && ids.get(split.id) !== hash)
        throw new AppError(409, 'IMPORT_CONFLICT');
      if (!hashes.has(hash)) {
        incoming.push({ ...split, ownerId, fingerprint: hash });
        hashes.add(hash);
        ids.set(split.id, hash);
      }
    }
    if (incoming.length) await Split.insertMany(incoming, { session });
    imported = incoming.length;
  });
  return { imported };
}
