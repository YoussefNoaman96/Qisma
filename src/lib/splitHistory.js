import { isValidDate, isValidGroup } from './validation.js';

export const HISTORY_KEY = 'expenseSplitterHistory';
export const MAX_BACKUP_BYTES = 2_000_000;
const HISTORY_VERSION = 1;

function serializeHistory(records) {
  const text = JSON.stringify({ version: HISTORY_VERSION, splits: records });
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
    throw new Error('History is too large.');
  return text;
}

function isValidSplit(split) {
  return (
    !!split &&
    typeof split.id === 'string' &&
    !!split.id &&
    isValidDate(split.savedAt) &&
    isValidGroup(split.members, split.expenses) &&
    split.members.length >= 2 &&
    split.expenses.length > 0
  );
}

// Throw on unreadable history so saving cannot overwrite an existing archive.
export function readSplitHistory(storage = localStorage) {
  const raw = storage.getItem(HISTORY_KEY);
  if (raw === null) return [];
  return parseHistoryBackup(raw);
}

export function parseHistoryBackup(raw) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > MAX_BACKUP_BYTES)
    throw new Error('Backup is too large.');
  const data = JSON.parse(raw);
  if (data?.version !== HISTORY_VERSION || !Array.isArray(data.splits)) {
    throw new Error('Unsupported split history format.');
  }
  const ids = new Set();
  for (const split of data.splits) {
    if (!isValidSplit(split) || ids.has(split.id)) throw new Error('Invalid saved split.');
    ids.add(split.id);
  }
  return data.splits.sort(
    (first, second) => Date.parse(second.savedAt) - Date.parse(first.savedAt),
  );
}

function signature({ members, expenses }) {
  return JSON.stringify({
    members: members.map(({ id, name }) => [id, name]),
    expenses: expenses.map(({ id, amount, payerId, description, createdAt }) => [
      id,
      amount,
      payerId,
      description,
      createdAt,
    ]),
  });
}

export function sameSplit(first, second) {
  return signature(first) === signature(second);
}

export function saveSplit(members, expenses, storage = localStorage) {
  // Copy only source data: later edits must never change saved snapshots.
  const split = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    members: members.map(({ id, name }) => ({ id, name })),
    expenses: expenses.map(({ id, amount, payerId, description, createdAt }) => ({
      id,
      amount,
      payerId,
      description,
      createdAt,
    })),
  };
  if (!isValidSplit(split))
    throw new Error('A saved split needs two members and at least one valid expense.');

  const records = readSplitHistory(storage);
  const existing = records.find((record) => signature(record) === signature(split));
  if (existing) return { records, split: existing, created: false };

  const nextRecords = [split, ...records];
  // Update React state only after this write succeeds (e.g. storage may be full).
  storage.setItem(HISTORY_KEY, serializeHistory(nextRecords));
  return { records: nextRecords, split, created: true };
}

export function exportHistoryBackup(storage = localStorage) {
  return serializeHistory(readSplitHistory(storage));
}

export function importHistoryBackup(raw, storage = localStorage) {
  const incoming = parseHistoryBackup(raw);
  const existing = readSplitHistory(storage);
  const records = [...existing];
  for (const split of incoming) {
    const sameId = records.find((record) => record.id === split.id);
    if (sameId && signature(sameId) !== signature(split))
      throw new Error('Conflicting saved split IDs.');
    if (!records.some((record) => signature(record) === signature(split))) records.push(split);
  }
  records.sort((first, second) => Date.parse(second.savedAt) - Date.parse(first.savedAt));
  storage.setItem(HISTORY_KEY, serializeHistory(records));
  return { records, imported: records.length - existing.length };
}

export function removeSavedSplit(id, storage = localStorage) {
  const records = readSplitHistory(storage).filter((split) => split.id !== id);
  storage.setItem(HISTORY_KEY, serializeHistory(records));
  return records;
}

export function clearSplitHistory(storage = localStorage) {
  storage.removeItem(HISTORY_KEY);
  return [];
}
