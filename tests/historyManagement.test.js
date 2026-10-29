import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearSplitHistory,
  exportHistoryBackup,
  importHistoryBackup,
  readSplitHistory,
  removeSavedSplit,
  saveSplit,
} from '../src/lib/splitHistory.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function addSplit(storage, amount = 10000) {
  return saveSplit(
    [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' },
    ],
    [
      {
        id: `expense-${amount}`,
        amount,
        payerId: 'a',
        description: 'Dinner',
        createdAt: '2026-10-28T14:00:00.000Z',
      },
    ],
    storage,
  ).split;
}

test('backups can be restored in a different browser without changing amounts or dates', () => {
  const original = memoryStorage();
  addSplit(original);
  addSplit(original, 12345);
  const otherBrowser = memoryStorage();
  const result = importHistoryBackup(exportHistoryBackup(original), otherBrowser);
  assert.equal(result.imported, 2);
  assert.deepEqual(readSplitHistory(otherBrowser), readSplitHistory(original));
});

test('import merges records and repeated imports do not create duplicates', () => {
  const original = memoryStorage();
  const destination = memoryStorage();
  addSplit(original);
  addSplit(destination, 25000);
  const backup = exportHistoryBackup(original);
  assert.equal(importHistoryBackup(backup, destination).imported, 1);
  assert.equal(importHistoryBackup(backup, destination).imported, 0);
  assert.equal(readSplitHistory(destination).length, 2);
});

test('malformed, oversized, or conflicting imports preserve the entire existing archive', () => {
  const storage = memoryStorage();
  const saved = addSplit(storage);
  const before = exportHistoryBackup(storage);
  const conflict = {
    ...saved,
    expenses: saved.expenses.map((expense) => ({ ...expense, amount: 1 })),
  };
  for (const text of [
    'invalid',
    'x'.repeat(2_000_001),
    JSON.stringify({ version: 1, splits: [conflict] }),
  ]) {
    assert.throws(() => importHistoryBackup(text, storage));
    assert.equal(exportHistoryBackup(storage), before);
  }
});

test('deleting one split preserves other records, draft data and preferences', () => {
  const storage = memoryStorage();
  storage.setItem('expenseSplitterDraft', 'draft');
  storage.setItem('expenseSplitterLanguage', 'en');
  const first = addSplit(storage);
  const second = addSplit(storage, 12000);
  assert.deepEqual(
    removeSavedSplit(first.id, storage).map((split) => split.id),
    [second.id],
  );
  assert.equal(storage.getItem('expenseSplitterDraft'), 'draft');
  assert.equal(storage.getItem('expenseSplitterLanguage'), 'en');
});

test('clearing history removes only the archive and permits a later backup restoration', () => {
  const storage = memoryStorage();
  addSplit(storage);
  const backup = exportHistoryBackup(storage);
  storage.setItem('expenseSplitterDraft', 'draft');
  clearSplitHistory(storage);
  assert.deepEqual(readSplitHistory(storage), []);
  assert.equal(storage.getItem('expenseSplitterDraft'), 'draft');
  assert.equal(importHistoryBackup(backup, storage).imported, 1);
});

test('failed deletion writes do not mutate stored records', () => {
  const storage = memoryStorage();
  const saved = addSplit(storage);
  const before = exportHistoryBackup(storage);
  assert.throws(() =>
    removeSavedSplit(saved.id, {
      getItem: storage.getItem,
      setItem() {
        throw new Error('Blocked');
      },
    }),
  );
  assert.equal(exportHistoryBackup(storage), before);
});

test('backup deduplication is independent of JSON object property order', () => {
  const storage = memoryStorage();
  const split = addSplit(storage);
  const reordered = {
    ...split,
    members: split.members.map((member) => ({ name: member.name, id: member.id })),
    expenses: split.expenses.map((expense) => ({
      createdAt: expense.createdAt,
      description: expense.description,
      payerId: expense.payerId,
      amount: expense.amount,
      id: expense.id,
    })),
  };
  assert.equal(
    importHistoryBackup(JSON.stringify({ version: 1, splits: [reordered] }), storage).imported,
    0,
  );
  assert.equal(readSplitHistory(storage).length, 1);
});

test('ambiguous member names in imported archives are rejected before any write', () => {
  const storage = memoryStorage();
  const saved = addSplit(storage);
  const before = exportHistoryBackup(storage);
  const invalid = {
    ...saved,
    members: saved.members.map((member) => ({ ...member, name: ' Alice ' })),
  };
  assert.throws(() =>
    importHistoryBackup(JSON.stringify({ version: 1, splits: [invalid] }), storage),
  );
  assert.equal(exportHistoryBackup(storage), before);
});
