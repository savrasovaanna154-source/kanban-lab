import request from 'supertest';
import app from '../index';

describe('Boards API', () => {
  let token: string;
  let projectId: string;

  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      email: 'boarduser@test.com',
      password: 'password123',
    });
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'boarduser@test.com',
      password: 'password123',
    });
    token = loginRes.body.accessToken;

    const projRes = await request(app)
      .post('/api/projects')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Test Project' });
    projectId = projRes.body.project.id;
  });

  it('создаёт доску с 3 колонками', async () => {
    const res = await request(app)
      .post('/api/boards')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'My Board', projectId });
    expect(res.status).toBe(201);
    expect(res.body.board.columns).toHaveLength(3);
  });

  it('400 при коротком названии', async () => {
    const res = await request(app)
      .post('/api/boards')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'A', projectId });
    expect(res.status).toBe(400);
  });

  it('404 при несуществующем проекте', async () => {
    const res = await request(app)
      .post('/api/boards')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'My Board', projectId: 'nonexistent' });
    expect(res.status).toBe(404);
  });

  it('GET /api/boards/:id возвращает доску', async () => {
    const createRes = await request(app)
      .post('/api/boards')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'My Board', projectId });
    const boardId = createRes.body.board.id;

    const res = await request(app)
      .get('/api/boards/' + boardId)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.board.id).toBe(boardId);
  });

  it('PATCH обновляет название', async () => {
    const createRes = await request(app)
      .post('/api/boards')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Old Name', projectId });
    const boardId = createRes.body.board.id;

    const res = await request(app)
      .patch('/api/boards/' + boardId)
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.board.name).toBe('New Name');
  });

  it('DELETE удаляет доску', async () => {
    const createRes = await request(app)
      .post('/api/boards')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'To Delete', projectId });
    const boardId = createRes.body.board.id;

    const res = await request(app)
      .delete('/api/boards/' + boardId)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});