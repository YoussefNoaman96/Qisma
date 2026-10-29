import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { Split } from '../models/Split.js';
import { RateLimit } from '../models/RateLimit.js';

export async function connectDatabase(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 20, minPoolSize: 0 });
  await Promise.all([User, Session, Split, RateLimit].map((model) => model.init()));
}
