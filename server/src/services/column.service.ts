import { prisma } from '../lib/prisma';

export class ColumnError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

async function assertBoardOwner(boardId: string, userId: string) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { project: true },
  });
  if (!board) throw new ColumnError('NOT_FOUND', 'Доска не найдена', 404);
  if (board.project.ownerId !== userId) throw new ColumnError('FORBIDDEN', 'Нет доступа', 403);
  return board;
}

export async function createColumn(boardId: string, userId: string, name: string, wipLimit?: number) {
  if (!name || name.trim().length < 1) {
    throw new ColumnError('VALIDATION_ERROR', 'Название колонки обязательно');
  }
  await assertBoardOwner(boardId, userId);

  const maxOrder = await prisma.column.aggregate({
    where: { boardId },
    _max: { order: true },
  });

  return prisma.column.create({
    data: {
      name: name.trim(),
      boardId,
      wipLimit: wipLimit ?? null,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
}

export async function updateColumn(id: string, userId: string, data: { name?: string; wipLimit?: number | null; order?: number }) {
  const column = await prisma.column.findUnique({
    where: { id },
    include: { board: { include: { project: true } } },
  });
  if (!column) throw new ColumnError('NOT_FOUND', 'Колонка не найдена', 404);
  if (column.board.project.ownerId !== userId) throw new ColumnError('FORBIDDEN', 'Нет доступа', 403);

  return prisma.column.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.wipLimit !== undefined && { wipLimit: data.wipLimit }),
      ...(data.order !== undefined && { order: data.order }),
    },
  });
}

export async function deleteColumn(id: string, userId: string) {
  const column = await prisma.column.findUnique({
    where: { id },
    include: { board: { include: { project: true } } },
  });
  if (!column) throw new ColumnError('NOT_FOUND', 'Колонка не найдена', 404);
  if (column.board.project.ownerId !== userId) throw new ColumnError('FORBIDDEN', 'Нет доступа', 403);
  await prisma.column.delete({ where: { id } });
  return { ok: true };
}
