import { test } from 'node:test';
import request from 'supertest';
import { createApp } from '../app.js';

function app(nodeEnv, appOrigin) {
  return createApp({ nodeEnv, appOrigin, trustProxy: 0, secureCookies: nodeEnv === 'production' });
}

// An unknown API route proves that the Origin guard passed without writing to a database.
test('development accepts both loopback hostnames on the configured port', async () => {
  for (const configured of ['http://127.0.0.1:5173', 'http://localhost:5173']) {
    for (const origin of ['http://127.0.0.1:5173', 'http://localhost:5173']) {
      await request(app('development', configured))
        .post('/api/origin-probe')
        .set('Origin', origin)
        .expect(404);
    }
  }
});

test('development still rejects other ports, sites, schemes, missing and null origins', async () => {
  const development = app('development', 'http://127.0.0.1:5173');
  for (const origin of [
    'http://127.0.0.1:5174',
    'http://localhost:5174',
    'https://localhost:5173',
    'http://localhost.evil.test:5173',
    'https://untrusted.example',
    'null',
  ]) {
    await request(development).post('/api/origin-probe').set('Origin', origin).expect(403);
  }
  await request(development).post('/api/origin-probe').expect(403);
});

test('production only accepts the exact configured origin', async () => {
  const production = app('production', 'https://expenses.example');
  await request(production)
    .post('/api/origin-probe')
    .set('Origin', 'https://expenses.example')
    .expect(404);
  for (const origin of [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://expenses.example',
    'https://other.example',
  ]) {
    await request(production).post('/api/origin-probe').set('Origin', origin).expect(403);
  }
  const loopback = app('production', 'https://localhost:5173');
  await request(loopback)
    .post('/api/origin-probe')
    .set('Origin', 'https://127.0.0.1:5173')
    .expect(403);
});
