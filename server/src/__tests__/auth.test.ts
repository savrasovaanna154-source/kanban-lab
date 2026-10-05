import request from 'supertest';
import app from '../index';

describe('Auth API', () => {
  it('register: создаёт пользователя', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@test.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('a@test.com');
  });

  it('register: 409 при дубликате', async () => {
    await request(app).post('/api/auth/register').send({ email: 'b@test.com', password: 'password123' });
    const res = await request(app).post('/api/auth/register').send({ email: 'b@test.com', password: 'password456' });
    expect(res.status).toBe(409);
  });

  it('login: возвращает JWT', async () => {
    await request(app).post('/api/auth/register').send({ email: 'c@test.com', password: 'password123' });
    const res = await request(app).post('/api/auth/login').send({ email: 'c@test.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('login: 401 при неверном пароле', async () => {
    await request(app).post('/api/auth/register').send({ email: 'd@test.com', password: 'password123' });
    const res = await request(app).post('/api/auth/login').send({ email: 'd@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('health: ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
