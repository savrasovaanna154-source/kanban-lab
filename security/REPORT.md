# Отчёт о security-тестировании

## 1. npm audit

### Backend (server/)
- Команда: `npm audit`
- **Найдено: 36 уязвимостей (5 moderate, 30 high, 1 critical)**
- **Все уязвимости — в dev-зависимостях**, не в runtime-коде
- Ключевые затронутые пакеты:
  - `tar` < 7.5.20 (critical) — транзитивная зависимость `@mapbox/node-pre-gyp` (используется Prisma для скачивания engine)
  - `esbuild`, `jest`, `ts-jest` — только для сборки и тестов
- **Влияние на production**: отсутствует — dev-зависимости не попадают в deploy

### Frontend (client/)
- Команда: `npm audit --production`
- Результат: без критических уязвимостей в runtime

## 2. Меры защиты, реализованные в приложении

### Аутентификация и авторизация
- ✅ **Пароли**: bcrypt с cost = 10
- ✅ **JWT**: HMAC-SHA256, TTL access = 15 мин, refresh = 7 дней
- ✅ **Разграничение доступа**: middleware `requireAuth` + `requireRole`
- ✅ **Роли**: admin / manager / developer

### Защита от типовых атак
- ✅ **XSS**: React экранирует пользовательские данные
- ✅ **CSRF**: JWT в заголовке `Authorization` (не cookies) — CSRF невозможен
- ✅ **SQL-инъекции**: Prisma parameterized queries
- ✅ **Mass assignment**: Zod-схемы валидируют входные данные

### HTTP-безопасность
- ✅ **Helmet**: CSP, X-Frame-Options, HSTS, X-Content-Type-Options
- ✅ **CORS**: настроен через `cors` middleware
- ⚠️ **Rate limiting**: не реализовано (рекомендуется для production)

### Управление секретами
- ✅ **`.env`** в `.gitignore` — не пушится
- ✅ **`.env.example`** — шаблон без секретов в git
- ✅ **JWT_SECRET** отдельный для dev / test / prod
## 2.5. OWASP ZAP Baseline Scan

- Инструмент: OWASP ZAP 2.x (Docker)
- Цель: http://localhost:3000
- Режим: baseline (пассивное сканирование)
- Команда:
  docker run --rm --network host -v $(pwd)/security:/zap/wrk:rw -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://localhost:3000 -J zap-report.json -r zap-report.html

## 3. Рекомендации

1. **Rate limiting** на `/api/auth/login` и `/api/auth/register` (пакет `express-rate-limit`)
2. **HTTPS** в production (обязательно)
3. **Обновление dev-зависимостей** (36 уязвимостей в npm audit)
4. **Усиление CSP-заголовков** через helmet
5. **Логирование security-событий** (неудачные логины, 401, 403)

## 4. Соответствие требованиям

| NFR | Требование | Статус |
|---|---|---|
| NFR-03 | Защита от XSS | ✅ React + CSP |
| NFR-04 | Защита от CSRF | ✅ JWT в header |
| NFR-05 | Защита от SQL-инъекций | ✅ Prisma |
| NFR-06 | Хеширование паролей | ✅ bcrypt cost=10 |
| NFR-07 | HTTPS | ⏳ prod |

## 5. Выводы

- **Runtime-код защищён**: JWT, bcrypt, Prisma, Helmet, Zod — базовые механизмы реализованы
- **Уязвимости npm audit** — только в dev-зависимостях, не влияют на production
- **Рекомендуется** добавить rate-limiting и обновить dev-зависимости перед production
- **Для учебного проекта** текущий уровень безопасности соответствует требованиям