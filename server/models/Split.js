import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({ id: String, name: String }, { _id: false });
const expenseSchema = new mongoose.Schema(
  { id: String, amount: Number, payerId: String, description: String, createdAt: String },
  { _id: false },
);
const splitSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    id: { type: String, required: true },
    savedAt: { type: Date, required: true },
    fingerprint: { type: String, required: true },
    members: { type: [memberSchema], required: true },
    expenses: { type: [expenseSchema], required: true },
  },
  { versionKey: false },
);

splitSchema.index({ ownerId: 1, id: 1 }, { unique: true });
splitSchema.index({ ownerId: 1, fingerprint: 1 }, { unique: true });
splitSchema.index({ ownerId: 1, savedAt: -1, _id: -1 });
export const Split = mongoose.model('Split', splitSchema);
