import { randomBytes } from 'node:crypto';
import { startTestDatabase } from './database.js';
import { createApp } from '../app.js';

const stopDatabase = await startTestDatabase();
const app = createApp({
  nodeEnv: 'test',
  appOrigin: 'http://127.0.0.1:5174',
  jwtSecret: randomBytes(48).toString('hex'),
  secureCookies: false,
  trustProxy: 0,
});
const server = app.listen(3002, '127.0.0.1', () =>
  console.log('Isolated test API ready on port 3002.'),
);
async function stop() {
  server.close(async () => {
    await stopDatabase();
    process.exit(0);
  });
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
