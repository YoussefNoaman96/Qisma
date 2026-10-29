import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshHash: { type: String, required: true },
    previousTokens: [{ _id: false, hash: String, usedAt: Date }],
    csrfHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export const Session = mongoose.model('Session', sessionSchema);
