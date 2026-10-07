import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import api from '../api/client';
import Modal from '../components/Modal';

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

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#9ca3af',
  medium: '#3b82f6',
  high: '#f59e0b',
  critical: '#ef4444',
};

function DraggableCard({ card }: { card: Card }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.5 : 1 }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderLeftColor: PRIORITY_COLORS[card.priority] }}
      className="card"
      {...listeners}
      {...attributes}
    >
      <div className="card-title">{card.title}</div>
      {card.description && <div className="card-desc">{card.description}</div>}
      <div className="card-footer">
        <span className="priority-badge" style={{ background: PRIORITY_COLORS[card.priority] }}>
          {PRIORITY_LABELS[card.priority]}
        </span>
      </div>
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
    <div ref={setNodeRef} className={`column ${isOver ? 'column-over' : ''}`}>
      <div className="column-header">
        <h3>{column.name}</h3>
        {column.wipLimit !== null && (
          <span className={`wip ${isOverLimit ? 'wip-limit' : ''}`}>
            {column.cards.length}/{column.wipLimit}
          </span>
        )}
        <button onClick={() => onDeleteColumn(column.id)} className="btn-icon" title="Удалить колонку">
          ×
        </button>
      </div>
      <div className="column-cards">
        {column.cards.map((c) => (
          <DraggableCard key={c.id} card={c} />
        ))}
        {column.cards.length === 0 && (
          <div className="empty-column">Перетащите карточку сюда</div>
        )}
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
  const [error, setError] = useState('');

  // Модальные окна
  const [cardModal, setCardModal] = useState<{ open: boolean; columnId: string }>({ open: false, columnId: '' });
  const [columnModal, setColumnModal] = useState(false);

  // Формы
  const [cardForm, setCardForm] = useState({ title: '', description: '', priority: 'medium' });
  const [columnForm, setColumnForm] = useState({ name: '', wipLimit: '' });

  const loadBoard = async () => {
    try {
      const res = await api.get(`/boards/${id}`);
      setBoard(res.data.board);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Ошибка загрузки');
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

  const submitCard = async () => {
    if (!cardForm.title.trim()) return;
    try {
      await api.post('/cards', {
        title: cardForm.title,
        description: cardForm.description || undefined,
        priority: cardForm.priority,
        columnId: cardModal.columnId,
      });
      setCardModal({ open: false, columnId: '' });
      setCardForm({ title: '', description: '', priority: 'medium' });
      loadBoard();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Ошибка создания карточки');
    }
  };

  const submitColumn = async () => {
    if (!columnForm.name.trim()) return;
    try {
      await api.post('/columns', {
        name: columnForm.name,
        boardId: id,
        ...(columnForm.wipLimit ? { wipLimit: parseInt(columnForm.wipLimit) } : {}),
      });
      setColumnModal(false);
      setColumnForm({ name: '', wipLimit: '' });
      loadBoard();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Ошибка создания колонки');
    }
  };

  const deleteColumn = async (columnId: string) => {
    if (!confirm('Удалить колонку со всеми карточками?')) return;
    await api.delete(`/columns/${columnId}`);
    loadBoard();
  };

  if (loading) return <div className="container"><div className="loader">Загрузка...</div></div>;
  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!board) return <div className="container">Доска не найдена</div>;

  return (
    <div className="container-board">
      <header className="board-header">
        <button onClick={() => navigate('/projects')} className="btn-secondary">
          ← К проектам
        </button>
        <h1>{board.name}</h1>
        <button onClick={() => setColumnModal(true)} className="btn-primary">
          + Колонка
        </button>
      </header>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="board">
          {board.columns.map((col) => (
            <DroppableColumn
              key={col.id}
              column={col}
              onAddCard={(columnId) => setCardModal({ open: true, columnId })}
              onDeleteColumn={deleteColumn}
            />
          ))}
        </div>
      </DndContext>

      {/* Модальное окно создания карточки */}
      <Modal
        open={cardModal.open}
        title="Новая карточка"
        onClose={() => setCardModal({ open: false, columnId: '' })}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCardModal({ open: false, columnId: '' })}>
              Отмена
            </button>
            <button className="btn-primary" onClick={submitCard}>
              Создать
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Название *</label>
          <input
            type="text"
            value={cardForm.title}
            onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })}
            placeholder="Что нужно сделать?"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Описание</label>
          <textarea
            value={cardForm.description}
            onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
            placeholder="Дополнительные детали..."
            rows={3}
          />
        </div>
        <div className="form-group">
          <label>Приоритет</label>
          <select
            value={cardForm.priority}
            onChange={(e) => setCardForm({ ...cardForm, priority: e.target.value })}
          >
            <option value="low">🟢 Низкий</option>
            <option value="medium">🔵 Средний</option>
            <option value="high">🟠 Высокий</option>
            <option value="critical">🔴 Критический</option>
          </select>
        </div>
      </Modal>

      {/* Модальное окно создания колонки */}
      <Modal
        open={columnModal}
        title="Новая колонка"
        onClose={() => setColumnModal(false)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setColumnModal(false)}>
              Отмена
            </button>
            <button className="btn-primary" onClick={submitColumn}>
              Создать
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Название *</label>
          <input
            type="text"
            value={columnForm.name}
            onChange={(e) => setColumnForm({ ...columnForm, name: e.target.value })}
            placeholder="Например: Ревью, Тестирование"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>WIP-лимит (необязательно)</label>
          <input
            type="number"
            min="1"
            value={columnForm.wipLimit}
            onChange={(e) => setColumnForm({ ...columnForm, wipLimit: e.target.value })}
            placeholder="Максимум карточек"
          />
        </div>
      </Modal>
    </div>
  );
}