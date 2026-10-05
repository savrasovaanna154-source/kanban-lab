# Архитектура приложения «Kanban-доска»

## 1. Общая схема

```mermaid
graph TB
    subgraph Client["Клиент (SPA)"]
        UI[React + MUI]
        Store[Redux Toolkit]
        APIC[API client: axios + JWT]
    end

    subgraph Server["Сервер (Express)"]
        R[Routes]
        M[Middleware: auth, validation, errors]
        S[Services: бизнес-логика]
        Repo[Repositories: Prisma]
    end

    DB[(PostgreSQL 16)]
    Redis[(Redis — cache / rate-limit)]

    UI --> Store --> APIC
    APIC -->|REST /api| R
    R --> M --> S --> Repo --> DB
    S -.-> Redis