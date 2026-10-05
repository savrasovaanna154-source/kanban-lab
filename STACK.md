# Обоснование выбора технологического стека

**Проект:** Kanban-доска (аналог Jira)
**Автор:** savrasovaanna154-источник

## 1. Выбранный стек

| Слой | Технология |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| State management | Redux Toolkit |
| Роутинг | React Router v6 |
| Drag-and-drop | dnd-kit |
| UI-библиотека | Material-UI (MUI) |
| Backend | Node.js 20 + Express + TypeScript |
| ORM | Prisma |
| База данных | PostgreSQL 16 |
| Аутентификация | JWT (jsonwebtoken) + bcrypt |
| Валидация | Zod |
| Модульные тесты | Jest + ts-jest |
| Интеграционные тесты | Supertest + Testcontainers |
| E2E-тесты | Playwright |
| Нагрузочные тесты | k6 (через Docker) |
| Security | OWASP ZAP (Docker) + npm audit |
| CI/CD | GitHub Actions |
| Инфраструктура | Docker Compose |
| Облачная среда разработки | GitHub Codespaces |

## 2. Обоснование выбора

1. **Единый язык — TypeScript** на клиенте и сервере. Это снижает стоимость переключения контекста и позволяет переиспользовать DTO-типы между слоями.
2. **Express** — минималистичный фреймворк, легко покрывается интеграционными тестами через Supertest, есть зрелые middleware (helmet, cors, express-rate-limit).
3. **Prisma** даёт типобезопасный доступ к БД, миграции «из коробки» и удобен для написания тестов с Testcontainers.
4. **PostgreSQL** — реляционная модель хорошо ложится на иерархию `Project → Board → Column → Card`, поддерживает транзакции и ограничения целостности.
5. **Playwright** поддерживает Chromium, Firefox и WebKit, кросс-браузерные E2E запускаются прямо в Codespaces без установки браузеров на компьютер.
6. **GitHub Actions** — нативная интеграция с репозиторием, бесплатно для публичных репозиториев, легко настраиваются отчёты о покрытии (Codecov).
7. **GitHub Codespaces** — полностью облачная среда разработки, ничего не устанавливается на локальный компьютер, что соответствует ограничениям лабораторной.

## 3. Рассмотренные альтернативы

| Альтернатива | Почему отклонена |
|---|---|
| NestJS | Избыточен для объёма лабораторной, много boilerplate-кода |
| Django + DRF | Смешение Python и TypeScript, у команды меньше опыта |
| MongoDB | Иерархия Project→Board→Column→Card удобнее в реляционной модели |
| Cypress | Не поддерживает Firefox и WebKit в бесплатной версии |
| JMeter | Требует GUI, неудобно в headless-режиме Codespaces |
| GitLab CI | Основная платформа — GitHub, поэтому используется GitHub Actions |

## 4. Ограничения выбранного стека

- Node.js однопоточный — для достижения 1000 RPS потребуется кластеризация (cluster module) или горизонтальное масштабирование.
- SQLite не подходит для целевой нагрузки, поэтому выбрана PostgreSQL.
- WebSocket-обновления (real-time) реализуются опционально; при отсутствии — доска обновляется polling каждые 5 секунд.
- Prisma имеет накладные расходы при генерации клиента, но это компенсируется типобезопасностью.

## 5. Соответствие требованиям задания

| Требование | Как обеспечивается |
|---|---|
| Функциональные требования (п. 3.1) | Полный CRUD + RBAC + JWT |
| Производительность (NFR-01, NFR-02) | Индексы в БД, пагинация, k6-тесты |
| Безопасность (NFR-03…NFR-07) | helmet, bcrypt, Zod, Prisma, HTTPS в prod |
| Покрытие тестами (NFR-11, NFR-12) | Jest + Supertest + Playwright, отчёты Codecov |
| CI/CD | GitHub Actions с прогоном всех тестов |
| Документирование API | Swagger UI на /api-docs |