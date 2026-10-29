import mongoose from 'mongoose';
import { readConfig } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { createApp } from './app.js';

try {
  const config = readConfig();
  await connectDatabase(config.mongoUri);
  const server = createApp(config).listen(config.port, '0.0.0.0', () => {
    console.log(`Expense Splitter API listening on port ${config.port}`);
  });
  async function shutdown() {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
} catch (error) {
  console.error(
    error.message?.startsWith('Invalid server configuration')
      ? error.message
      : 'API startup failed. Check server/.env, Atlas database credentials and its network access list.',
  );
  process.exitCode = 1;
}
