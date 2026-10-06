import request from 'supertest';
import app from '../index';

describe('Projects API', () => {
  let token: string;

  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      email: 'projuser@test.com',
      password: 'password123',
    });
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'projuser@test.com',
      password: 'password123',
    });
    token = loginRes.body.accessToken;
  });

  it('POST создаёт проект', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'New Project' });
    expect(res.status).toBe(201);
    expect(res.body.project.name).toBe('New Project');
  });

  it('400 при коротком названии', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'A' });
    expect(res.status).toBe(400);
  });

  it('GET возвращает список проектов', async () => {
    await request(app)
      .post('/api/projects')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Project 1' });
    await request(app)
      .post('/api/projects')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Project 2' });

    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.projects).toHaveLength(2);
  });

  it('GET /:id возвращает один проект', async () => {
    const createRes = await request(app)
      .post('/api/projects')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Single' });
    const id = createRes.body.project.id;

    const res = await request(app)
      .get('/api/projects/' + id)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.project.id).toBe(id);
  });

  it('PATCH обновляет проект', async () => {
    const createRes = await request(app)
      .post('/api/projects')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Old' });
    const id = createRes.body.project.id;

    const res = await request(app)
      .patch('/api/projects/' + id)
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.project.name).toBe('Updated');
  });

  it('DELETE удаляет проект', async () => {
    const createRes = await request(app)
      .post('/api/projects')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'To Delete' });
    const id = createRes.body.project.id;

    const res = await request(app)
      .delete('/api/projects/' + id)
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('404 для несуществующего проекта', async () => {
    const res = await request(app)
      .get('/api/projects/nonexistent')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(404);
  });
});