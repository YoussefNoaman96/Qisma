import { Router } from 'express';
import { z } from 'zod';
import { groupSchema, importSchema, splitIdSchema } from '../../shared/splitSchemas.js';
import { Split } from '../models/Split.js';
import { AppError } from '../middleware/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../services/sessions.js';
import { exportSplits, getSplit, importSplits, listSplits, saveSplit } from '../services/splits.js';
import { rateLimit } from '../middleware/rateLimit.js';

export function splitRoutes(config) {
  const router = Router();
  router.use(requireAuth(config));
  router.use(
    rateLimit({
      scope: 'splits',
      maximum: 180,
      windowMs: 60 * 1000,
      key: (req) => String(req.auth.user._id),
    }),
  );
  router.get('/', async (req, res) => {
    const parsed = z
      .object({
        cursor: z.string().max(1024).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .strict()
      .safeParse(req.query);
    if (!parsed.success) throw new AppError(400, 'INVALID_QUERY');
    res.json(await listSplits(req.auth.user._id, parsed.data));
  });
  router.post('/', validate(groupSchema), async (req, res) => {
    const result = await saveSplit(req.auth.user._id, req.validated);
    res.status(result.created ? 201 : 200).json(result);
  });
  router.get('/export', async (req, res) => res.json(await exportSplits(req.auth.user._id)));
  router.post(
    '/import',
    rateLimit({
      scope: 'import',
      maximum: 20,
      windowMs: 60 * 60 * 1000,
      key: (req) => String(req.auth.user._id),
    }),
    validate(importSchema),
    async (req, res) => {
      res.json(await importSplits(req.auth.user._id, req.validated.splits));
    },
  );
  router.delete('/', async (req, res) => {
    await Split.deleteMany({ ownerId: req.auth.user._id });
    res.status(204).end();
  });
  router.get('/:id', async (req, res) => {
    if (!splitIdSchema.safeParse(req.params.id).success) throw new AppError(400, 'INVALID_ID');
    res.json({ split: await getSplit(req.auth.user._id, req.params.id) });
  });
  router.delete('/:id', async (req, res) => {
    if (!splitIdSchema.safeParse(req.params.id).success) throw new AppError(400, 'INVALID_ID');
    const result = await Split.deleteOne({ ownerId: req.auth.user._id, id: req.params.id });
    if (!result.deletedCount) throw new AppError(404, 'SPLIT_NOT_FOUND');
    res.status(204).end();
  });
  return router;
}
