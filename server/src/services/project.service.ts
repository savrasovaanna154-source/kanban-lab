import { prisma } from '../lib/prisma';

export class ProjectError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

export async function createProject(ownerId: string, name: string) {
  if (!name || name.trim().length < 2) {
    throw new ProjectError('VALIDATION_ERROR', 'Название должно содержать минимум 2 символа');
  }
  return prisma.project.create({
    data: { name: name.trim(), ownerId },
    include: { boards: true },
  });
}

export async function listProjects(ownerId: string) {
  return prisma.project.findMany({
    where: { ownerId },
    include: { boards: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProject(id: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      boards: {
        include: {
          columns: { orderBy: { order: 'asc' }, include: { cards: true } },
        },
      },
    },
  });
  if (!project) throw new ProjectError('NOT_FOUND', 'Проект не найден', 404);
  if (project.ownerId !== userId) throw new ProjectError('FORBIDDEN', 'Нет доступа', 403);
  return project;
}

export async function updateProject(id: string, userId: string, name: string) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw new ProjectError('NOT_FOUND', 'Проект не найден', 404);
  if (project.ownerId !== userId) throw new ProjectError('FORBIDDEN', 'Нет доступа', 403);
  return prisma.project.update({ where: { id }, data: { name } });
}

export async function deleteProject(id: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw new ProjectError('NOT_FOUND', 'Проект не найден', 404);
  if (project.ownerId !== userId) throw new ProjectError('FORBIDDEN', 'Нет доступа', 403);
  await prisma.project.delete({ where: { id } });
  return { ok: true };
}
