import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';

// Tests always create an isolated replica set. They never read server/.env or Atlas.
export async function startTestDatabase() {
  const directory = path.resolve('.tmp/mongodb');
  await mkdir(directory, { recursive: true });
  const database = await MongoMemoryReplSet.create({
    binary: { version: '8.0.17', downloadDir: directory },
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  await connectDatabase(database.getUri('expense_splitter_tests'));
  return async () => {
    await mongoose.disconnect();
    await database.stop();
  };
}
