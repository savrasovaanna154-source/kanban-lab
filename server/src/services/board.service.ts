import { prisma } from '../lib/prisma';

export class BoardError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

export async function createBoard(projectId: string, userId: string, name: string) {
  if (!name || name.trim().length < 2) {
    throw new BoardError('VALIDATION_ERROR', 'Название должно содержать минимум 2 символа');
  }
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new BoardError('NOT_FOUND', 'Проект не найден', 404);
  if (project.ownerId !== userId) throw new BoardError('FORBIDDEN', 'Нет доступа', 403);

  return prisma.board.create({
    data: {
      name: name.trim(),
      projectId,
      columns: {
        create: [
          { name: 'To Do', order: 0 },
          { name: 'In Progress', order: 1 },
          { name: 'Done', order: 2 },
        ],
      },
    },
    include: { columns: { orderBy: { order: 'asc' } } },
  });
}

export async function getBoard(id: string, userId: string) {
  console.log('=== getBoard DEBUG ===');
  console.log('id:', JSON.stringify(id));
  console.log('userId:', JSON.stringify(userId));

  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      project: true,
      columns: {
        orderBy: { order: 'asc' },
        include: { cards: { orderBy: { order: 'asc' } } },
      },
    },
  });

  console.log('board found:', board ? 'YES' : 'NO');

  if (!board) throw new BoardError('NOT_FOUND', 'Доска не найдена', 404);
  if (board.project.ownerId !== userId) throw new BoardError('FORBIDDEN', 'Нет доступа', 403);
  return board;
}

export async function updateBoard(id: string, userId: string, name: string) {
  const board = await prisma.board.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!board) throw new BoardError('NOT_FOUND', 'Доска не найдена', 404);
  if (board.project.ownerId !== userId) throw new BoardError('FORBIDDEN', 'Нет доступа', 403);
  return prisma.board.update({ where: { id }, data: { name } });
}

export async function deleteBoard(id: string, userId: string) {
  const board = await prisma.board.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!board) throw new BoardError('NOT_FOUND', 'Доска не найдена', 404);
  if (board.project.ownerId !== userId) throw new BoardError('FORBIDDEN', 'Нет доступа', 403);
  await prisma.board.delete({ where: { id } });
  return { ok: true };
}
