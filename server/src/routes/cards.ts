import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as svc from '../services/card.service';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  title: z.string().min(1),
  columnId: z.string(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  dueDate: z.string().nullable().optional(),
});

const moveSchema = z.object({ targetColumnId: z.string() });

router.post('/', async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.issues } });
  try {
    const { columnId, ...data } = parsed.data;
    const card = await svc.createCard(columnId, req.user!.id, data);
    res.status(201).json({ card });
  } catch (e: any) {
    res.status(e.status || 500).json({ error: { code: e.code || 'INTERNAL_ERROR', message: e.message } });
  }
});

router.patch('/:id', async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.issues } });
  try {
    const card = await svc.updateCard(req.params.id, req.user!.id, parsed.data);
    res.json({ card });
  } catch (e: any) {
    res.status(e.status || 500).json({ error: { code: e.code || 'INTERNAL_ERROR', message: e.message } });
  }
});

router.patch('/:id/move', async (req: AuthRequest, res) => {
  const parsed = moveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.issues } });
  try {
    const card = await svc.moveCard(req.params.id, req.user!.id, parsed.data.targetColumnId);
    res.json({ card });
  } catch (e: any) {
    res.status(e.status || 500).json({ error: { code: e.code || 'INTERNAL_ERROR', message: e.message } });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await svc.deleteCard(req.params.id, req.user!.id);
    res.json(result);
  } catch (e: any) {
    res.status(e.status || 500).json({ error: { code: e.code || 'INTERNAL_ERROR', message: e.message } });
  }
});

export default router;
