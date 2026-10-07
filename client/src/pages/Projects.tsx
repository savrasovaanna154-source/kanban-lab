import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../store/auth';
import Modal from '../components/Modal';

interface Project {
  id: string;
  name: string;
  boards: { id: string; name: string }[];
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectModal, setProjectModal] = useState(false);
  const [boardModal, setBoardModal] = useState<{ open: boolean; projectId: string }>({ open: false, projectId: '' });

  const [projectForm, setProjectForm] = useState({ name: '' });
  const [boardForm, setBoardForm] = useState({ name: '' });

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const loadProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.projects);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const submitProject = async () => {
    if (!projectForm.name.trim()) return;
    await api.post('/projects', { name: projectForm.name });
    setProjectModal(false);
    setProjectForm({ name: '' });
    loadProjects();
  };

  const submitBoard = async () => {
    if (!boardForm.name.trim()) return;
    const res = await api.post('/boards', { name: boardForm.name, projectId: boardModal.projectId });
    setBoardModal({ open: false, projectId: '' });
    setBoardForm({ name: '' });
    navigate(`/board/${res.data.board.id}`);
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Удалить проект со всеми досками?')) return;
    await api.delete(`/projects/${id}`);
    loadProjects();
  };

  return (
    <div className="container">
      <header className="app-header">
        <div className="app-logo">
          <span className="logo-icon">📋</span>
          <h1>Канбан-доска</h1>
        </div>
        <div className="user-info">
          <span className="user-email">{user?.email}</span>
          <button onClick={logout} className="btn-secondary">
            Выйти
          </button>
        </div>
      </header>

      <div className="page-title-row">
        <h2>Мои проекты</h2>
        <button onClick={() => setProjectModal(true)} className="btn-primary">
          + Новый проект
        </button>
      </div>

      {loading ? (
        <div className="loader">Загрузка...</div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <h3>Пока нет проектов</h3>
          <p>Создайте первый проект, чтобы начать работу</p>
          <button onClick={() => setProjectModal(true)} className="btn-primary">
            Создать проект
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((p) => (
            <div key={p.id} className="project-card">
              <div className="project-card-header">
                <h3>{p.name}</h3>
                <button
                  onClick={() => deleteProject(p.id)}
                  className="btn-icon-danger"
                  title="Удалить проект"
                >
                  🗑
                </button>
              </div>

              <div className="boards-list">
                {p.boards.length === 0 ? (
                  <div className="empty-boards">Нет досок</div>
                ) : (
                  p.boards.map((b) => (
                    <button
                      key={b.id}
                      className="board-link"
                      onClick={() => navigate(`/board/${b.id}`)}
                    >
                      <span>📋</span>
                      <span>{b.name}</span>
                    </button>
                  ))
                )}
              </div>

              <button
                onClick={() => setBoardModal({ open: true, projectId: p.id })}
                className="btn-add-board"
              >
                + Добавить доску
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно создания проекта */}
      <Modal
        open={projectModal}
        title="Новый проект"
        onClose={() => setProjectModal(false)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setProjectModal(false)}>
              Отмена
            </button>
            <button className="btn-primary" onClick={submitProject}>
              Создать
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Название проекта *</label>
          <input
            type="text"
            value={projectForm.name}
            onChange={(e) => setProjectForm({ name: e.target.value })}
            placeholder="Например: Разработка сайта"
            autoFocus
          />
        </div>
      </Modal>

      {/* Модальное окно создания доски */}
      <Modal
        open={boardModal.open}
        title="Новая доска"
        onClose={() => setBoardModal({ open: false, projectId: '' })}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setBoardModal({ open: false, projectId: '' })}>
              Отмена
            </button>
            <button className="btn-primary" onClick={submitBoard}>
              Создать
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Название доски *</label>
          <input
            type="text"
            value={boardForm.name}
            onChange={(e) => setBoardForm({ name: e.target.value })}
            placeholder="Например: Спринт 1"
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
}