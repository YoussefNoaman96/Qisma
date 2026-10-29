import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { startTestDatabase } from '../testing/database.js';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { Split } from '../models/Split.js';
import { RateLimit } from '../models/RateLimit.js';
import { hashToken } from '../middleware/security.js';
import { readConfig } from '../config/env.js';

const origin = 'http://127.0.0.1:5174';
const config = {
  nodeEnv: 'test',
  appOrigin: origin,
  jwtSecret: randomBytes(48).toString('hex'),
  secureCookies: false,
  trustProxy: 0,
};
const app = createApp(config);
const credentials = {
  name: 'Sample Person',
  email: 'person@example.test',
  password: 'a unique test passphrase',
  confirmPassword: 'a unique test passphrase',
};
const group = {
  members: [
    { id: 'one', name: 'Alex' },
    { id: 'two', name: 'Sam' },
  ],
  expenses: [
    {
      id: 'expense',
      payerId: 'one',
      amount: 1025,
      description: 'Lunch',
      createdAt: '2026-01-01T12:00:00.000Z',
    },
  ],
};
let stopDatabase;
before(
  async () => {
    stopDatabase = await startTestDatabase();
  },
  { timeout: 900000 },
);
after(async () => {
  if (stopDatabase) await stopDatabase();
});
beforeEach(async () => {
  await Promise.all([User, Session, Split, RateLimit].map((model) => model.deleteMany({})));
});

function cookies(response) {
  return Object.fromEntries(
    response.headers['set-cookie'].map((value) => value.split(';')[0].split('=')),
  );
}
function sessionRequest(method, url, jar) {
  return request(app)
    [method](url)
    .set('Origin', origin)
    .set(
      'Cookie',
      Object.entries(jar)
        .map(([key, value]) => `${key}=${value}`)
        .join('; '),
    )
    .set('X-CSRF-Token', jar.csrf_token);
}
async function register(email = credentials.email) {
  const response = await request(app)
    .post('/api/auth/register')
    .set('Origin', origin)
    .send({ ...credentials, email })
    .expect(201);
  return { response, jar: cookies(response), user: response.body.user };
}

test('configuration rejects missing values without including their contents', () => {
  assert.throws(
    () => readConfig({ MONGODB_URI: 'private-invalid-value' }),
    (error) => !error.message.includes('private-invalid-value'),
  );
  assert.throws(() =>
    readConfig({
      NODE_ENV: 'production',
      APP_ORIGIN: origin,
      MONGODB_URI: 'mongodb://localhost/test',
      JWT_SECRET: config.jwtSecret,
    }),
  );
});

test('registration hashes passwords, normalizes email, and sends cookie-only tokens', async () => {
  const { response, user } = await register('PERSON@example.test');
  assert.equal(user.email, credentials.email);
  assert.deepEqual(Object.keys(response.body), ['user']);
  assert.deepEqual(Object.keys(user).sort(), ['email', 'id', 'name']);
  const stored = await User.findById(user.id).select('+passwordHash');
  assert.match(stored.passwordHash, /^\$argon2id\$/u);
  assert.notEqual(stored.passwordHash, credentials.password);
  const tokens = response.headers['set-cookie'];
  assert.ok(
    tokens
      .filter((value) => /^(access|refresh)_token=/u.test(value))
      .every((value) => /HttpOnly/u.test(value) && /SameSite=Strict/u.test(value)),
  );
  assert.ok(!tokens.find((value) => value.startsWith('csrf_token=')).includes('HttpOnly'));
  const secureApp = createApp({ ...config, secureCookies: true });
  const signedIn = await request(secureApp)
    .post('/api/auth/login')
    .set('Origin', origin)
    .send({ email: credentials.email, password: credentials.password })
    .expect(200);
  assert.ok(signedIn.headers['set-cookie'].every((value) => value.includes('Secure')));
});

test('strict validation rejects weak passwords, mismatches, unknown keys, and operator objects', async () => {
  for (const body of [
    { ...credentials, password: 'short', confirmPassword: 'short' },
    { ...credentials, confirmPassword: 'different' },
    { ...credentials, email: { $ne: null } },
    { ...credentials, role: 'admin' },
    { ...credentials, name: '\u0000Alice' },
  ])
    await request(app).post('/api/auth/register').set('Origin', origin).send(body).expect(400);
  assert.equal(await User.countDocuments(), 0);
});

test('login uses generic credential errors and rejects duplicate accounts', async () => {
  await register();
  await request(app).post('/api/auth/register').set('Origin', origin).send(credentials).expect(409);
  const unknown = await request(app)
    .post('/api/auth/login')
    .set('Origin', origin)
    .send({ email: 'unknown@example.test', password: 'bad' })
    .expect(401);
  const wrong = await request(app)
    .post('/api/auth/login')
    .set('Origin', origin)
    .send({ email: credentials.email, password: 'bad' })
    .expect(401);
  assert.deepEqual(unknown.body.error, wrong.body.error);
});

test('origin and CSRF checks reject forged state-changing requests', async () => {
  await request(app).post('/api/auth/register').send(credentials).expect(403);
  await request(app)
    .post('/api/auth/register')
    .set('Origin', 'https://untrusted.example')
    .send(credentials)
    .expect(403);
  const { jar } = await register();
  await sessionRequest('post', '/api/splits', jar)
    .set('X-CSRF-Token', 'wrong')
    .send(group)
    .expect(403);
  await sessionRequest('post', '/api/auth/refresh', jar)
    .set('X-CSRF-Token', 'wrong')
    .send({})
    .expect(403);
  await request(app).get('/api/splits').expect(401);
});

test('saved splits deduplicate, paginate, and prevent cross-account reads and deletes', async () => {
  const alice = await register();
  const bob = await register('bob@example.test');
  const created = await sessionRequest('post', '/api/splits', alice.jar).send(group).expect(201);
  const duplicate = await sessionRequest('post', '/api/splits', alice.jar).send(group).expect(200);
  assert.equal(duplicate.body.split.id, created.body.split.id);
  await sessionRequest('post', '/api/splits', alice.jar)
    .send({ ...group, expenses: [{ ...group.expenses[0], amount: 500 }] })
    .expect(201);
  await sessionRequest('get', `/api/splits/${created.body.split.id}`, bob.jar).expect(404);
  await sessionRequest('delete', `/api/splits/${created.body.split.id}`, bob.jar).expect(404);
  const first = await sessionRequest('get', '/api/splits?limit=1', alice.jar).expect(200);
  assert.equal(first.body.total, 2);
  assert.ok(first.body.nextCursor);
  const next = await sessionRequest(
    'get',
    `/api/splits?limit=1&cursor=${first.body.nextCursor}`,
    alice.jar,
  ).expect(200);
  assert.notEqual(first.body.records[0].id, next.body.records[0].id);
  assert.equal(next.body.nextCursor, null);
  await sessionRequest('get', '/api/splits?cursor=broken', alice.jar).expect(400);
  await sessionRequest('delete', '/api/splits', bob.jar).expect(204);
  assert.equal((await sessionRequest('get', '/api/splits', alice.jar)).body.total, 2);
  await sessionRequest('delete', `/api/splits/${created.body.split.id}`, alice.jar).expect(204);
  assert.equal((await sessionRequest('get', '/api/splits', alice.jar)).body.total, 1);
  await sessionRequest('delete', '/api/splits', alice.jar).expect(204);
  assert.equal(await Split.countDocuments(), 0);
});

test('server validates payer references, integer money, sizes, and minimum members', async () => {
  const { jar } = await register();
  for (const invalid of [
    { ...group, members: group.members.slice(0, 1) },
    { ...group, expenses: [{ ...group.expenses[0], amount: 1.1 }] },
    { ...group, expenses: [{ ...group.expenses[0], payerId: 'unknown' }] },
    { ...group, expenses: [{ ...group.expenses[0], amount: -1 }] },
    { ...group, ownerId: 'someone-else' },
    { ...group, expenses: [] },
  ])
    await sessionRequest('post', '/api/splits', jar).send(invalid).expect(400);
  await sessionRequest('post', '/api/splits', jar)
    .send({ ...group, padding: 'x'.repeat(2_000_001) })
    .expect(413);
  assert.equal(await Split.countDocuments(), 0);
});

test('imports are atomic, preserve dates, deduplicate contents, and export versioned backups', async () => {
  const { jar } = await register();
  const split = { ...group, id: 'original', savedAt: '2026-01-02T12:00:00.000Z' };
  const imported = await sessionRequest('post', '/api/splits/import', jar)
    .send({ version: 1, splits: [split] })
    .expect(200);
  assert.equal(imported.body.imported, 1);
  const duplicate = await sessionRequest('post', '/api/splits/import', jar)
    .send({ version: 1, splits: [{ ...split, id: 'different-id' }] })
    .expect(200);
  assert.equal(duplicate.body.imported, 0);
  const other = { ...split, id: 'new-id', expenses: [{ ...group.expenses[0], amount: 400 }] };
  const conflict = { ...split, expenses: [{ ...group.expenses[0], amount: 700 }] };
  await sessionRequest('post', '/api/splits/import', jar)
    .send({ version: 1, splits: [other, conflict] })
    .expect(409);
  assert.equal(await Split.countDocuments(), 1);
  const backup = await sessionRequest('get', '/api/splits/export', jar).expect(200);
  assert.deepEqual(backup.body, { version: 1, splits: [split] });
});

test('expired JWT refreshes with rotation; replay revokes the whole session', async () => {
  const { jar, user } = await register();
  const session = await Session.findOne({ userId: user.id });
  const expired = jwt.sign({ sid: String(session._id) }, config.jwtSecret, {
    algorithm: 'HS256',
    subject: user.id,
    issuer: 'expense-splitter',
    audience: 'expense-splitter-web',
    expiresIn: -1,
  });
  await sessionRequest('get', '/api/auth/session', { ...jar, access_token: expired }).expect(401);
  const response = await sessionRequest('post', '/api/auth/refresh', jar).send({}).expect(200);
  const current = { ...jar, ...cookies(response) };
  assert.notEqual(current.refresh_token, jar.refresh_token);
  const stored = await Session.findById(session._id);
  assert.equal(stored.refreshHash, hashToken(current.refresh_token));
  assert.ok(!JSON.stringify(stored).includes(current.refresh_token));
  await sessionRequest('post', '/api/auth/refresh', jar).send({}).expect(409);
  await Session.updateOne(
    { _id: session._id },
    { $set: { 'previousTokens.0.usedAt': new Date(Date.now() - 10000) } },
  );
  await sessionRequest('post', '/api/auth/refresh', jar).send({}).expect(401);
  await sessionRequest('get', '/api/auth/session', current).expect(401);
});

test('logout accepts a recently rotated token and revokes access immediately', async () => {
  const { jar } = await register();
  const rotation = await sessionRequest('post', '/api/auth/refresh', jar).send({}).expect(200);
  const current = { ...jar, ...cookies(rotation) };
  await sessionRequest('post', '/api/auth/logout', jar).send({}).expect(204);
  await sessionRequest('get', '/api/auth/session', current).expect(401);
});

test('excessive refreshes end the session rather than growing replay history indefinitely', async () => {
  const { jar, user } = await register();
  await Session.updateOne(
    { userId: user.id },
    {
      previousTokens: Array.from({ length: 1024 }, (_, index) => ({
        hash: hashToken(String(index)),
        usedAt: new Date(),
      })),
    },
  );
  await sessionRequest('post', '/api/auth/refresh', jar).send({}).expect(401);
  await sessionRequest('get', '/api/auth/session', jar).expect(401);
});

test('sign out everywhere invalidates separate sessions', async () => {
  const { jar } = await register();
  const second = await request(app)
    .post('/api/auth/login')
    .set('Origin', origin)
    .send({ email: credentials.email, password: credentials.password })
    .expect(200);
  await sessionRequest('post', '/api/auth/logout-all', jar).send({}).expect(204);
  await sessionRequest('get', '/api/auth/session', cookies(second)).expect(401);
});

test('Mongo-backed login limits return Retry-After and do not leak database details', async () => {
  await RateLimit.create({ _id: 'unused', count: 1, expiresAt: new Date() });
  for (let attempt = 0; attempt < 10; attempt++)
    await request(app)
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({ email: 'missing@example.test', password: 'bad' })
      .expect(401);
  const limited = await request(app)
    .post('/api/auth/login')
    .set('Origin', origin)
    .send({ email: 'missing@example.test', password: 'bad' })
    .expect(429);
  assert.ok(Number(limited.headers['retry-after']) > 0);
  assert.equal(limited.body.error.code, 'TOO_MANY_REQUESTS');
  assert.ok(!JSON.stringify(limited.body).includes('mongodb'));
});
