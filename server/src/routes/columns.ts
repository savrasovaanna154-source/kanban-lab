import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as svc from '../services/column.service';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({ name: z.string().min(1), boardId: z.string(), wipLimit: z.number().int().positive().optional() });
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  wipLimit: z.number().int().positive().nullable().optional(),
  order: z.number().int().optional(),
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.issues } });
  try {
    const column = await svc.createColumn(parsed.data.boardId, req.user!.id, parsed.data.name, parsed.data.wipLimit);
    res.status(201).json({ column });
  } catch (e: any) {
    res.status(e.status || 500).json({ error: { code: e.code || 'INTERNAL_ERROR', message: e.message } });
  }
});

router.patch('/:id', async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.issues } });
  try {
    const column = await svc.updateColumn(req.params.id, req.user!.id, parsed.data);
    res.json({ column });
  } catch (e: any) {
    res.status(e.status || 500).json({ error: { code: e.code || 'INTERNAL_ERROR', message: e.message } });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await svc.deleteColumn(req.params.id, req.user!.id);
    res.json(result);
  } catch (e: any) {
    res.status(e.status || 500).json({ error: { code: e.code || 'INTERNAL_ERROR', message: e.message } });
  }
});

export default router;
