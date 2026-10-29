import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateResults, parseAmount } from '../src/lib/expenses.js';

const members = ['A', 'B', 'C'].map((id) => ({ id, name: id }));
const expense = (amount, payerId = 'A') => ({ amount, payerId });

test('amount parsing is exact, bounded and rejects invalid precision', () => {
  assert.equal(parseAmount('0.01'), 1);
  assert.equal(parseAmount('12.3'), 1230);
  assert.equal(parseAmount('999999999.99'), 99999999999);
  for (const value of ['', '0', '-1', '1.001', 'Infinity', '1e3', '1000000000', 'NaN', '5abc']) {
    assert.equal(parseAmount(value), null, value);
  }
});

test('Arabic and Persian digits keep exact piastre values without accepting grouping or invalid precision', () => {
  for (const value of ['١٢٣٫٤٥', '۱۲۳.۴۵', '123.45']) assert.equal(parseAmount(value), 12345);
  for (const value of ['١٫٠٠١', '٠', '١٬٢٣٤', '1,234', null, {}, 12])
    assert.equal(parseAmount(value), null);
});

test('a 100 EGP expense splits into 33.34, 33.33 and 33.33 without lost piastres', () => {
  const result = calculateResults(members, [expense(10000)]);
  assert.equal(result.total, 10000);
  assert.deepEqual(
    result.balances.map((member) => member.share),
    [3334, 3333, 3333],
  );
  assert.deepEqual(result.transactions, [
    { fromId: 'B', toId: 'A', amount: 3333 },
    { fromId: 'C', toId: 'A', amount: 3333 },
  ]);
});

test('opposite debts cancel instead of producing circular payments', () => {
  const result = calculateResults(members.slice(0, 2), [expense(10000), expense(10000, 'B')]);
  assert.deepEqual(
    result.balances.map((member) => member.balance),
    [0, 0],
  );
  assert.deepEqual(result.transactions, []);
});

test('adding and removing a non-payer recalculates the entire group', () => {
  assert.deepEqual(
    calculateResults(members.slice(0, 2), [expense(12000)]).balances.map((member) => member.share),
    [6000, 6000],
  );
  assert.deepEqual(
    calculateResults(members, [expense(12000)]).balances.map((member) => member.share),
    [4000, 4000, 4000],
  );
});

test('groups being set up can have fewer than two members until expenses are added', () => {
  assert.deepEqual(calculateResults([], []), { total: 0, balances: [], transactions: [] });
  assert.deepEqual(calculateResults(members, []).transactions, []);
  assert.deepEqual(calculateResults(members.slice(0, 1), []).transactions, []);
});

test('splitting an expense requires at least two members', () => {
  assert.throws(() => calculateResults([], [expense(100)]), /at least two members/);
  assert.throws(
    () => calculateResults(members.slice(0, 1), [expense(100)]),
    /at least two members/,
  );
  assert.deepEqual(calculateResults(members.slice(0, 2), [expense(100)]).transactions, [
    { fromId: 'B', toId: 'A', amount: 50 },
  ]);
});

test('orphan payers and invalid internal amounts cannot silently corrupt totals', () => {
  assert.throws(() => calculateResults([], [expense(100)]));
  assert.throws(() => calculateResults(members, [expense(100, 'unknown')]));
  assert.throws(() => calculateResults(members, [expense(1.5)]));
});

test('hundreds of varied groups conserve money and settle every balance exactly', () => {
  for (let memberCount = 2; memberCount <= 20; memberCount++) {
    const people = Array.from({ length: memberCount }, (_, index) => ({
      id: String(index),
      name: String(index),
    }));
    for (let seed = 1; seed <= 30; seed++) {
      const expenses = Array.from({ length: seed }, (_, index) =>
        expense(((seed * 997 + index * 31) % 99999) + 1, String(index % memberCount)),
      );
      const result = calculateResults(people, expenses);
      assert.equal(
        result.balances.reduce((sum, member) => sum + member.balance, 0),
        0,
      );
      assert.equal(
        result.balances.reduce((sum, member) => sum + member.share, 0),
        result.total,
      );
      const after = new Map(result.balances.map((member) => [member.id, member.balance]));
      for (const transfer of result.transactions) {
        assert.ok(Number.isSafeInteger(transfer.amount) && transfer.amount > 0);
        assert.notEqual(transfer.fromId, transfer.toId);
        after.set(transfer.fromId, after.get(transfer.fromId) + transfer.amount);
        after.set(transfer.toId, after.get(transfer.toId) - transfer.amount);
      }
      assert.ok([...after.values()].every((value) => value === 0));
    }
  }
});
