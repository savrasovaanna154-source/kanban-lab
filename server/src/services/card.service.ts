import { prisma } from '../lib/prisma';

export class CardError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

async function assertColumnOwner(columnId: string, userId: string) {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    include: { board: { include: { project: true } } },
  });
  if (!column) throw new CardError('NOT_FOUND', 'Колонка не найдена', 404);
  if (column.board.project.ownerId !== userId) throw new CardError('FORBIDDEN', 'Нет доступа', 403);
  return column;
}

export async function createCard(
  columnId: string,
  userId: string,
  data: { title: string; description?: string; priority?: 'low' | 'medium' | 'high' | 'critical'; dueDate?: string; assigneeId?: string }
) {
  if (!data.title || data.title.trim().length < 1) {
    throw new CardError('VALIDATION_ERROR', 'Название обязательно');
  }
  const column = await assertColumnOwner(columnId, userId);

  if (column.wipLimit !== null) {
    const count = await prisma.card.count({ where: { columnId } });
    if (count >= column.wipLimit) {
      throw new CardError('WIP_LIMIT', 'Превышен WIP-лимит колонки', 409);
    }
  }

  const maxOrder = await prisma.card.aggregate({
    where: { columnId },
    _max: { order: true },
  });

  return prisma.card.create({
    data: {
      title: data.title.trim(),
      description: data.description,
      priority: data.priority ?? 'medium',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      assigneeId: data.assigneeId,
      columnId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
}

export async function updateCard(
  id: string,
  userId: string,
  data: { title?: string; description?: string; priority?: 'low' | 'medium' | 'high' | 'critical'; dueDate?: string | null }
) {
  const card = await prisma.card.findUnique({
    where: { id },
    include: { column: { include: { board: { include: { project: true } } } } },
  });
  if (!card) throw new CardError('NOT_FOUND', 'Карточка не найдена', 404);
  if (card.column.board.project.ownerId !== userId) throw new CardError('FORBIDDEN', 'Нет доступа', 403);

  return prisma.card.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
    },
  });
}

export async function moveCard(id: string, userId: string, targetColumnId: string) {
  const card = await prisma.card.findUnique({
    where: { id },
    include: { column: { include: { board: { include: { project: true } } } } },
  });
  if (!card) throw new CardError('NOT_FOUND', 'Карточка не найдена', 404);
  if (card.column.board.project.ownerId !== userId) throw new CardError('FORBIDDEN', 'Нет доступа', 403);

  const targetColumn = await prisma.column.findUnique({
    where: { id: targetColumnId },
    include: { board: true },
  });
  if (!targetColumn) throw new CardError('NOT_FOUND', 'Целевая колонка не найдена', 404);
  if (targetColumn.boardId !== card.column.boardId) {
    throw new CardError('VALIDATION_ERROR', 'Колонка принадлежит другой доске');
  }

  if (targetColumn.wipLimit !== null) {
    const count = await prisma.card.count({ where: { columnId: targetColumnId } });
    if (count >= targetColumn.wipLimit && card.columnId !== targetColumnId) {
      throw new CardError('WIP_LIMIT', 'Превышен WIP-лимит целевой колонки', 409);
    }
  }

  const maxOrder = await prisma.card.aggregate({
    where: { columnId: targetColumnId },
    _max: { order: true },
  });

  return prisma.card.update({
    where: { id },
    data: {
      columnId: targetColumnId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
}

export async function deleteCard(id: string, userId: string) {
  const card = await prisma.card.findUnique({
    where: { id },
    include: { column: { include: { board: { include: { project: true } } } } },
  });
  if (!card) throw new CardError('NOT_FOUND', 'Карточка не найдена', 404);
  if (card.column.board.project.ownerId !== userId) throw new CardError('FORBIDDEN', 'Нет доступа', 403);
  await prisma.card.delete({ where: { id } });
  return { ok: true };
}
