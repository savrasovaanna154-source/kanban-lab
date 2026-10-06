import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../store/auth';

interface Project {
  id: string;
  name: string;
  boards: { id: string; name: string }[];
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
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

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await api.post('/projects', { name: newName });
    setNewName('');
    loadProjects();
  };

  const createBoard = async (projectId: string) => {
    const name = prompt('Название доски:', 'Моя доска');
    if (!name) return;
    const res = await api.post('/boards', { name, projectId });
    navigate(`/board/${res.data.board.id}`);
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Удалить проект?')) return;
    await api.delete(`/projects/${id}`);
    loadProjects();
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Мои проекты</h1>
        <div>
          <span>{user?.email}</span>
          <button onClick={logout} className="btn-secondary">
            Выйти
          </button>
        </div>
      </header>

      <form onSubmit={createProject} className="create-form">
        <input
          type="text"
          placeholder="Название нового проекта"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit">Создать проект</button>
      </form>

      {loading ? (
        <p>Загрузка...</p>
      ) : projects.length === 0 ? (
        <p>Пока нет проектов. Создайте первый!</p>
      ) : (
        <div className="projects-grid">
          {projects.map((p) => (
            <div key={p.id} className="project-card">
              <h2>{p.name}</h2>
              <div className="boards-list">
                {p.boards.map((b) => (
                  <button
                    key={b.id}
                    className="board-link"
                    onClick={() => navigate(`/board/${b.id}`)}
                  >
                    📋 {b.name}
                  </button>
                ))}
              </div>
              <div className="project-actions">
                <button onClick={() => createBoard(p.id)}>+ Доска</button>
                <button onClick={() => deleteProject(p.id)} className="btn-danger">
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}