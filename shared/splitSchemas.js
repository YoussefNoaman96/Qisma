import { z } from 'zod';
import { isValidGroup, MAX_AMOUNT } from './groupValidation.js';

const id = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/u);
const member = z.object({ id, name: z.string().trim().min(1).max(100) }).strict();
const expense = z
  .object({
    id,
    amount: z.number().int().positive().max(MAX_AMOUNT),
    payerId: id,
    description: z.string().max(300),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();
export const groupSchema = z
  .object({
    members: z.array(member).min(2).max(200),
    expenses: z.array(expense).min(1).max(2000),
  })
  .strict()
  .refine((group) => isValidGroup(group.members, group.expenses), 'validation.group');
export const savedSplitSchema = z
  .object({
    id,
    savedAt: z.string().datetime({ offset: true }),
    members: z.array(member).min(2).max(200),
    expenses: z.array(expense).min(1).max(2000),
  })
  .strict()
  .refine((group) => isValidGroup(group.members, group.expenses), 'validation.group');
export const importSchema = z
  .object({ version: z.literal(1), splits: z.array(savedSplitSchema).max(500) })
  .strict()
  .refine(
    (data) => new Set(data.splits.map((split) => split.id)).size === data.splits.length,
    'validation.group',
  );
export const splitIdSchema = id;
