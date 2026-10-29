import test from 'node:test';
import assert from 'node:assert/strict';
import { DRAFT_KEY, discardDraft, emptyDraft, readDraft, writeDraft } from '../src/lib/draft.js';

function storage() {
  let value = null;
  return {
    getItem: () => value,
    setItem: (key, next) => {
      assert.equal(key, DRAFT_KEY);
      value = next;
    },
    removeItem: () => {
      value = null;
    },
  };
}

function fixture() {
  return {
    ...emptyDraft(),
    step: 2,
    members: [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' },
    ],
    expenses: [
      {
        id: 'dinner',
        payerId: 'a',
        amount: 10000,
        description: 'Dinner',
        createdAt: '2026-10-28T14:00:00.000Z',
      },
    ],
    memberName: 'Another member',
    expenseForm: {
      amount: '12.34',
      payerId: 'b',
      description: 'Unsaved text',
      editingId: 'dinner',
    },
  };
}

test('fresh drafts start empty and stored drafts restore members, expenses, step and unsaved form inputs', () => {
  const memory = storage();
  assert.deepEqual(readDraft(memory), emptyDraft());
  const draft = fixture();
  writeDraft(draft, memory);
  assert.deepEqual(readDraft(memory), draft);
  draft.expenses[0].amount = 1;
  assert.equal(readDraft(memory).expenses[0].amount, 10000);
});

test('discarding a draft leaves a fresh group without needing history access', () => {
  const memory = storage();
  writeDraft(fixture(), memory);
  discardDraft(memory);
  assert.deepEqual(readDraft(memory), emptyDraft());
});

test('invalid restored drafts cannot bypass member count, payer or edit-reference rules', () => {
  const mutations = [
    (draft) => {
      draft.members = [];
    },
    (draft) => {
      draft.step = 99;
    },
    (draft) => {
      draft.expenseForm.payerId = 'missing';
    },
    (draft) => {
      draft.expenseForm.editingId = 'missing';
    },
    (draft) => {
      draft.expenses[0].amount = 1.5;
    },
    (draft) => {
      draft.memberName = 'x'.repeat(101);
    },
  ];
  for (const mutate of mutations) {
    const memory = storage();
    const draft = fixture();
    mutate(draft);
    const raw = JSON.stringify({ version: 1, draft });
    memory.setItem(DRAFT_KEY, raw);
    assert.throws(() => readDraft(memory));
    assert.equal(memory.getItem(DRAFT_KEY), raw);
  }
});

test('storage failures are observable rather than silently claiming persistence', () => {
  assert.throws(
    () =>
      writeDraft(fixture(), {
        setItem() {
          throw new Error('Full');
        },
      }),
    /Full/,
  );
  assert.throws(
    () =>
      readDraft({
        getItem() {
          throw new Error('Blocked');
        },
      }),
    /Blocked/,
  );
});
