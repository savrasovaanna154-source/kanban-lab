import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import api from '../api/client';

interface Card {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface Column {
  id: string;
  name: string;
  wipLimit: number | null;
  cards: Card[];
}

interface BoardData {
  id: string;
  name: string;
  columns: Column[];
}

function DraggableCard({ card }: { card: Card }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.5 : 1 }
    : {};

  const priorityColor: Record<string, string> = {
    low: '#9ca3af',
    medium: '#3b82f6',
    high: '#f59e0b',
    critical: '#ef4444',
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderLeft: `4px solid ${priorityColor[card.priority]}` }}
      className="card"
      {...listeners}
      {...attributes}
    >
      <div className="card-title">{card.title}</div>
      {card.description && <div className="card-desc">{card.description}</div>}
      <div className="card-priority">{card.priority}</div>
    </div>
  );
}

function DroppableColumn({
  column,
  onAddCard,
  onDeleteColumn,
}: {
  column: Column;
  onAddCard: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const isOverLimit = column.wipLimit !== null && column.cards.length >= column.wipLimit;

  return (
    <div
      ref={setNodeRef}
      className={`column ${isOver ? 'column-over' : ''}`}
    >
      <div className="column-header">
        <h3>{column.name}</h3>
        {column.wipLimit !== null && (
          <span className={`wip ${isOverLimit ? 'wip-limit' : ''}`}>
            {column.cards.length}/{column.wipLimit}
          </span>
        )}
        <button onClick={() => onDeleteColumn(column.id)} className="btn-icon">
          ×
        </button>
      </div>
      <div className="column-cards">
        {column.cards.map((c) => (
          <DraggableCard key={c.id} card={c} />
        ))}
      </div>
      <button onClick={() => onAddCard(column.id)} className="btn-add-card">
        + Добавить карточку
      </button>
    </div>
  );
}

export default function Board() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBoard = async () => {
    try {
      const res = await api.get(`/boards/${id}`);
      setBoard(res.data.board);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
  }, [id]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !board) return;

    const cardId = String(active.id);
    const targetColumnId = String(over.id);

    let sourceColumn: Column | undefined;
    for (const col of board.columns) {
      if (col.cards.some((c) => c.id === cardId)) {
        sourceColumn = col;
        break;
      }
    }
    if (!sourceColumn || sourceColumn.id === targetColumnId) return;

    try {
      await api.patch(`/cards/${cardId}/move`, { targetColumnId });
      loadBoard();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Не удалось переместить карточку');
      loadBoard();
    }
  };

  const addCard = async (columnId: string) => {
    const title = prompt('Название карточки:');
    if (!title) return;
    const priority = prompt('Приоритет (low/medium/high/critical):', 'medium');
    try {
      await api.post('/cards', { title, columnId, priority: priority || 'medium' });
      loadBoard();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Ошибка создания карточки');
    }
  };

  const deleteColumn = async (columnId: string) => {
    if (!confirm('Удалить колонку со всеми карточками?')) return;
    await api.delete(`/columns/${columnId}`);
    loadBoard();
  };

  const addColumn = async () => {
    const name = prompt('Название колонки:');
    if (!name) return;
    const wip = prompt('WIP-лимит (пусто — без лимита):');
    await api.post('/columns', {
      name,
      boardId: id,
      ...(wip ? { wipLimit: parseInt(wip) } : {}),
    });
    loadBoard();
  };

  if (loading) return <div className="container">Загрузка...</div>;
  if (!board) return <div className="container">Доска не найдена</div>;

  return (
    <div className="container-board">
      <header className="header">
        <button onClick={() => navigate('/projects')} className="btn-secondary">
          ← К проектам
        </button>
        <h1>{board.name}</h1>
        <button onClick={addColumn}>+ Колонка</button>
      </header>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="board">
          {board.columns.map((col) => (
            <DroppableColumn
              key={col.id}
              column={col}
              onAddCard={addCard}
              onDeleteColumn={deleteColumn}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}