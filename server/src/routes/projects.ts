import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as svc from '../services/project.service';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({ name: z.string().min(2) });
const updateSchema = z.object({ name: z.string().min(2) });

router.post('/', async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.issues } });
  try {
    const project = await svc.createProject(req.user!.id, parsed.data.name);
    res.status(201).json({ project });
  } catch (e: any) {
    res.status(e.status || 500).json({ error: { code: e.code || 'INTERNAL_ERROR', message: e.message } });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const projects = await svc.listProjects(req.user!.id);
    res.json({ projects });
  } catch (e: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const project = await svc.getProject(req.params.id, req.user!.id);
    res.json({ project });
  } catch (e: any) {
    res.status(e.status || 500).json({ error: { code: e.code || 'INTERNAL_ERROR', message: e.message } });
  }
});

router.patch('/:id', async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.issues } });
  try {
    const project = await svc.updateProject(req.params.id, req.user!.id, parsed.data.name);
    res.json({ project });
  } catch (e: any) {
    res.status(e.status || 500).json({ error: { code: e.code || 'INTERNAL_ERROR', message: e.message } });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await svc.deleteProject(req.params.id, req.user!.id);
    res.json(result);
  } catch (e: any) {
    res.status(e.status || 500).json({ error: { code: e.code || 'INTERNAL_ERROR', message: e.message } });
  }
});

export default router;
