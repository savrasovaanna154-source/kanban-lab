import { Router } from 'express';
import { z } from 'zod';
import { register, login, AuthError } from '../services/auth.service';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  role: z.enum(['admin', 'manager', 'developer']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.issues } });
  }
  try {
    const user = await register(parsed.data);
    res.status(201).json({ user });
  } catch (e) {
    if (e instanceof AuthError) {
      return res.status(409).json({ error: { code: e.code, message: e.message } });
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.issues } });
  }
  try {
    const result = await login(parsed.data);
    res.json(result);
  } catch (e) {
    if (e instanceof AuthError) {
      return res.status(401).json({ error: { code: e.code, message: e.message } });
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
});

export default router;
