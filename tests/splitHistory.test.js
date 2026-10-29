import test from 'node:test';
import assert from 'node:assert/strict';
import { HISTORY_KEY, readSplitHistory, saveSplit } from '../src/lib/splitHistory.js';

function memoryStorage(initial = null) {
  let value = initial;
  let writes = 0;
  return {
    get writes() {
      return writes;
    },
    getItem(key) {
      assert.equal(key, HISTORY_KEY);
      return value;
    },
    setItem(key, next) {
      assert.equal(key, HISTORY_KEY);
      value = next;
      writes++;
    },
  };
}

function fixture() {
  return {
    members: [
      { id: 'one', name: 'Alice' },
      { id: 'two', name: 'Bob' },
    ],
    expenses: [
      {
        id: 'dinner',
        amount: 10000,
        payerId: 'one',
        description: 'Dinner',
        createdAt: '2026-10-28T14:00:00.000Z',
      },
    ],
  };
}

test('a new browser has an empty history', () => {
  assert.deepEqual(readSplitHistory(memoryStorage()), []);
});

test('saved splits survive a new read with their date, members and expenses', () => {
  const storage = memoryStorage();
  const group = fixture();
  const saved = saveSplit(group.members, group.expenses, storage);
  assert.equal(saved.created, true);
  assert.ok(Number.isFinite(Date.parse(saved.split.savedAt)));
  assert.deepEqual(readSplitHistory(storage), [saved.split]);
  assert.deepEqual(saved.split.members, group.members);
  assert.deepEqual(saved.split.expenses, group.expenses);
});

test('mutating the current group never changes an archived snapshot', () => {
  const storage = memoryStorage();
  const group = fixture();
  const saved = saveSplit(group.members, group.expenses, storage);
  group.members[0].name = 'Changed';
  group.expenses[0].amount = 1;
  group.expenses.push({ ...group.expenses[0], id: 'another' });
  assert.equal(saved.split.members[0].name, 'Alice');
  assert.equal(saved.split.expenses[0].amount, 10000);
  assert.equal(readSplitHistory(storage)[0].expenses.length, 1);
});

test('unchanged results reuse the same record and original save date without another write', () => {
  const storage = memoryStorage();
  const group = fixture();
  const first = saveSplit(group.members, group.expenses, storage);
  const second = saveSplit(group.members, group.expenses, storage);
  assert.equal(second.created, false);
  assert.equal(second.split.id, first.split.id);
  assert.equal(second.split.savedAt, first.split.savedAt);
  assert.equal(second.records.length, 1);
  assert.equal(storage.writes, 1);
});

test('edited results create another record while preserving the older version', () => {
  const storage = memoryStorage();
  const group = fixture();
  const first = saveSplit(group.members, group.expenses, storage);
  group.expenses[0].amount = 20000;
  const second = saveSplit(group.members, group.expenses, storage);
  assert.equal(second.records.length, 2);
  assert.notEqual(second.split.id, first.split.id);
  assert.equal(
    readSplitHistory(storage).find((split) => split.id === first.split.id).expenses[0].amount,
    10000,
  );
});

test('history is read newest first, regardless of serialized record order', () => {
  const storage = memoryStorage();
  const group = fixture();
  const first = saveSplit(group.members, group.expenses, storage).split;
  const older = { ...first, id: 'older', savedAt: '2026-10-27T10:00:00.000Z' };
  const newer = { ...first, id: 'newer', savedAt: '2026-10-28T10:00:00.000Z' };
  storage.setItem(HISTORY_KEY, JSON.stringify({ version: 1, splits: [older, newer] }));
  assert.deepEqual(
    readSplitHistory(storage).map((split) => split.id),
    ['newer', 'older'],
  );
});

test('different new groups can have identical names and amounts without being merged', () => {
  const storage = memoryStorage();
  const group = fixture();
  saveSplit(group.members, group.expenses, storage);
  const nextMembers = group.members.map((member) => ({ ...member, id: member.id + '-new' }));
  const nextExpenses = group.expenses.map((expense) => ({
    ...expense,
    id: 'new-dinner',
    payerId: 'one-new',
  }));
  assert.equal(saveSplit(nextMembers, nextExpenses, storage).records.length, 2);
});

test('empty or one-member splits cannot enter the archive', () => {
  const storage = memoryStorage();
  const group = fixture();
  assert.throws(() => saveSplit(group.members, [], storage));
  assert.throws(() => saveSplit(group.members.slice(0, 1), group.expenses, storage));
  assert.equal(storage.writes, 0);
});

test('invalid JSON and unknown versions are not overwritten when saving', () => {
  const group = fixture();
  for (const raw of ['invalid json', 'null', JSON.stringify({ version: 2, splits: [] })]) {
    const storage = memoryStorage(raw);
    assert.throws(() => readSplitHistory(storage));
    assert.throws(() => saveSplit(group.members, group.expenses, storage));
    assert.equal(storage.getItem(HISTORY_KEY), raw);
    assert.equal(storage.writes, 0);
  }
});

test('corrupt saved records are rejected before they can reach the results screen', () => {
  const storage = memoryStorage();
  const group = fixture();
  const saved = saveSplit(group.members, group.expenses, storage).split;
  const mutations = [
    (split) => {
      split.savedAt = 'invalid';
    },
    (split) => {
      split.members[1].id = split.members[0].id;
    },
    (split) => {
      split.expenses[0].payerId = 'missing';
    },
    (split) => {
      split.expenses[0].amount = 1.5;
    },
    (split) => {
      split.expenses[0].createdAt = 'invalid';
    },
    (split) => {
      split.expenses[0].description = null;
    },
  ];
  for (const mutate of mutations) {
    const invalid = structuredClone(saved);
    mutate(invalid);
    assert.throws(() =>
      readSplitHistory(memoryStorage(JSON.stringify({ version: 1, splits: [invalid] }))),
    );
  }
  assert.throws(() =>
    readSplitHistory(memoryStorage(JSON.stringify({ version: 1, splits: [saved, saved] }))),
  );
});

test('failed writes preserve the previous stored history and report failure', () => {
  const storage = memoryStorage();
  const group = fixture();
  const first = saveSplit(group.members, group.expenses, storage).split;
  const previousValue = storage.getItem(HISTORY_KEY);
  group.expenses[0].amount = 20000;
  const fullStorage = {
    getItem: storage.getItem,
    setItem() {
      throw new Error('Quota exceeded');
    },
  };
  assert.throws(() => saveSplit(group.members, group.expenses, fullStorage), /Quota exceeded/);
  assert.equal(storage.getItem(HISTORY_KEY), previousValue);
  assert.deepEqual(readSplitHistory(storage), [first]);
});
