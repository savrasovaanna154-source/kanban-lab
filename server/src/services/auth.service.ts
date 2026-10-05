import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh';
const JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL || '7d';
const BCRYPT_COST = Number(process.env.BCRYPT_COST || 10);

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  role?: 'admin' | 'manager' | 'developer';
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AuthError('EMAIL_TAKEN', 'Пользователь с таким email уже существует');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: passwordHash,
      name: input.name,
      role: input.role ?? 'developer',
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return user;
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AuthError('INVALID_CREDENTIALS', 'Неверный email или пароль');
  }

  const ok = await bcrypt.compare(input.password, user.password);
  if (!ok) {
    throw new AuthError('INVALID_CREDENTIALS', 'Неверный email или пароль');
  }

  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_TTL } as jwt.SignOptions
  );
  const refreshToken = jwt.sign(
    { sub: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_TTL } as jwt.SignOptions
  );

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { sub: string; role: string };
}
