import request from 'supertest';
import app from '../index';

describe('Cards API', () => {
  let token: string;
  let columnId: string;
  let boardId: string;

  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      email: 'carduser@test.com',
      password: 'password123',
    });
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'carduser@test.com',
      password: 'password123',
    });
    token = loginRes.body.accessToken;

    const projRes = await request(app)
      .post('/api/projects')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Card Project' });
    const projectId = projRes.body.project.id;

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Card Board', projectId });
    boardId = boardRes.body.board.id;
    columnId = boardRes.body.board.columns[0].id;
  });

  it('создаёт карточку', async () => {
    const res = await request(app)
      .post('/api/cards')
      .set('Authorization', 'Bearer ' + token)
      .send({ title: 'Task 1', columnId, priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.card.title).toBe('Task 1');
    expect(res.body.card.priority).toBe('high');
  });

  it('400 при пустом title', async () => {
    const res = await request(app)
      .post('/api/cards')
      .set('Authorization', 'Bearer ' + token)
      .send({ title: '', columnId });
    expect(res.status).toBe(400);
  });

  it('409 при превышении WIP-лимита', async () => {
    await request(app)
      .patch('/api/columns/' + columnId)
      .set('Authorization', 'Bearer ' + token)
      .send({ wipLimit: 1 });

    await request(app)
      .post('/api/cards')
      .set('Authorization', 'Bearer ' + token)
      .send({ title: 'Task 1', columnId });

    const res = await request(app)
      .post('/api/cards')
      .set('Authorization', 'Bearer ' + token)
      .send({ title: 'Task 2', columnId });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('WIP_LIMIT');
  });

  it('PATCH обновляет title и priority', async () => {
    const createRes = await request(app)
      .post('/api/cards')
      .set('Authorization', 'Bearer ' + token)
      .send({ title: 'Old', columnId });
    const cardId = createRes.body.card.id;

    const res = await request(app)
      .patch('/api/cards/' + cardId)
      .set('Authorization', 'Bearer ' + token)
      .send({ title: 'New', priority: 'critical' });
    expect(res.status).toBe(200);
    expect(res.body.card.title).toBe('New');
    expect(res.body.card.priority).toBe('critical');
  });

  it('move перемещает карточку в другую колонку', async () => {
    const boardRes = await request(app)
      .get('/api/boards/' + boardId)
      .set('Authorization', 'Bearer ' + token);
    const targetColumnId = boardRes.body.board.columns[1].id;

    const createRes = await request(app)
      .post('/api/cards')
      .set('Authorization', 'Bearer ' + token)
      .send({ title: 'Move me', columnId });
    const cardId = createRes.body.card.id;

    const res = await request(app)
      .patch('/api/cards/' + cardId + '/move')
      .set('Authorization', 'Bearer ' + token)
      .send({ targetColumnId });
    expect(res.status).toBe(200);
    expect(res.body.card.columnId).toBe(targetColumnId);
  });

  it('move возвращает 409 при WIP-лимите', async () => {
    const boardRes = await request(app)
      .get('/api/boards/' + boardId)
      .set('Authorization', 'Bearer ' + token);
    const targetColumnId = boardRes.body.board.columns[1].id;

    await request(app)
      .patch('/api/columns/' + targetColumnId)
      .set('Authorization', 'Bearer ' + token)
      .send({ wipLimit: 1 });

    await request(app)
      .post('/api/cards')
      .set('Authorization', 'Bearer ' + token)
      .send({ title: 'Blocker', columnId: targetColumnId });

    const createRes = await request(app)
      .post('/api/cards')
      .set('Authorization', 'Bearer ' + token)
      .send({ title: 'Cannot move', columnId });
    const cardId = createRes.body.card.id;

    const res = await request(app)
      .patch('/api/cards/' + cardId + '/move')
      .set('Authorization', 'Bearer ' + token)
      .send({ targetColumnId });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('WIP_LIMIT');
  });

  it('DELETE удаляет карточку', async () => {
    const createRes = await request(app)
      .post('/api/cards')
      .set('Authorization', 'Bearer ' + token)
      .send({ title: 'To delete', columnId });
    const cardId = createRes.body.card.id;

    const res = await request(app)
      .delete('/api/cards/' + cardId)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});