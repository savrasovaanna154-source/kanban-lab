import request from 'supertest';
import app from '../index';

describe('Columns API', () => {
  let token: string;
  let boardId: string;
  let columnId: string;

  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      email: 'coluser@test.com',
      password: 'password123',
    });
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'coluser@test.com',
      password: 'password123',
    });
    token = loginRes.body.accessToken;

    const projRes = await request(app)
      .post('/api/projects')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Col Project' });
    const projectId = projRes.body.project.id;

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Col Board', projectId });
    boardId = boardRes.body.board.id;
    columnId = boardRes.body.board.columns[0].id;
  });

  it('создаёт новую колонку', async () => {
    const res = await request(app)
      .post('/api/columns')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Review', boardId });
    expect(res.status).toBe(201);
    expect(res.body.column.name).toBe('Review');
  });

  it('400 при пустом названии колонки', async () => {
    const res = await request(app)
      .post('/api/columns')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: '', boardId });
    expect(res.status).toBe(400);
  });

  it('PATCH обновляет название и WIP-лимит', async () => {
    const res = await request(app)
      .patch('/api/columns/' + columnId)
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Updated', wipLimit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.column.name).toBe('Updated');
    expect(res.body.column.wipLimit).toBe(5);
  });

  it('PATCH меняет порядок', async () => {
    const res = await request(app)
      .patch('/api/columns/' + columnId)
      .set('Authorization', 'Bearer ' + token)
      .send({ order: 10 });
    expect(res.status).toBe(200);
    expect(res.body.column.order).toBe(10);
  });

  it('DELETE удаляет колонку', async () => {
    const res = await request(app)
      .delete('/api/columns/' + columnId)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('404 для несуществующей колонки', async () => {
    const res = await request(app)
      .patch('/api/columns/nonexistent')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});