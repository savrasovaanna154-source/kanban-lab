import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 50 },   // разогрев до 50
    { duration: '20s', target: 200 },  // до 200
    { duration: '20s', target: 200 },  // держим 200
    { duration: '10s', target: 0 },    // спад
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% запросов быстрее 500 мс
    http_req_failed: ['rate<0.05'],     // меньше 5% ошибок
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  // Создаём тестового пользователя
  const email = `load_${Date.now()}@test.com`;
  const password = 'password123';

  http.post(`${BASE}/api/auth/register`, JSON.stringify({
    email, password, name: 'Load User',
  }), { headers: { 'Content-Type': 'application/json' } });

  const loginRes = http.post(`${BASE}/api/auth/login`, JSON.stringify({
    email, password,
  }), { headers: { 'Content-Type': 'application/json' } });

  const token = loginRes.json('accessToken');
  return { token, email };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // 1. Health
  const health = http.get(`${BASE}/health`);
  check(health, { 'health ok': (r) => r.status === 200 });

  // 2. Список проектов
  const projects = http.get(`${BASE}/api/projects`, { headers });
  check(projects, { 'projects 200': (r) => r.status === 200 });

  // 3. Создание проекта
  const createProj = http.post(`${BASE}/api/projects`,
    JSON.stringify({ name: `Load Project ${__VU}-${__ITER}` }),
    { headers }
  );
  check(createProj, { 'project created': (r) => r.status === 201 });

  // 4. Список проектов ещё раз
  const listProj = http.get(`${BASE}/api/projects`, { headers });
  check(listProj, { 'list projects ok': (r) => r.status === 200 });

  sleep(0.1);
}