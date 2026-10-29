import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute } from '../src/lib/routes.js';

test('routes recognize only known pages and an optional history ID', () => {
  assert.deepEqual(parseRoute(''), { page: 'split', splitId: null });
  assert.equal(parseRoute('#/register').page, 'register');
  assert.deepEqual(parseRoute('#/history/abc-123'), { page: 'history', splitId: 'abc-123' });
  for (const hash of [
    '#/missing',
    '#/login/extra',
    '#/split/extra',
    '#/history/a/b',
    '#/history/<script>',
    '#register',
  ])
    assert.equal(parseRoute(hash).page, 'not-found');
});

test('unknown URL paths show 404, including under a Pages base path', () => {
  assert.equal(parseRoute('', '/missing/path').page, 'not-found');
  assert.equal(parseRoute('#/history', '/Qisma/', '/Qisma/').page, 'history');
  assert.equal(parseRoute('', '/Qisma/index.html', '/Qisma/').page, 'split');
  assert.equal(parseRoute('#/split', '/Qisma/unknown', '/Qisma/').page, 'not-found');
});
