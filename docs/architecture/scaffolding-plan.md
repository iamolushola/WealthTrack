# WealthTrack Scaffolding Plan

## Goal

This document turns the target architecture into a concrete codebase structure and implementation sequence for monorepo scaffolding, local infrastructure, and module generation.

## Monorepo structure

```text
.
├─ apps/
│  ├─ api/
│  │  └─ src/
│  │     ├─ app.module.ts
│  │     └─ modules/
│  │        ├─ auth/
│  │        ├─ users/
│  │        ├─ rbac/
│  │        ├─ uploads/
│  │        ├─ validation/
│  │        ├─ imports/
│  │        ├─ investments/
│  │        ├─ fund-classification/
│  │        ├─ tenor-classification/
│  │        ├─ analytics/
│  │        ├─ reports/
│  │        ├─ integrations/
│  │        ├─ sync/
│  │        ├─ audit/
│  │        ├─ settings/
│  │        ├─ notifications/
│  │        ├─ outbox/
│  │        ├─ jobs/
│  │        └─ health/
│  └─ worker/
│     └─ src/
│        ├─ queues/
│        ├─ processors/
│        └─ schedulers/
├─ packages/
│  ├─ config/
│  └─ shared-types/
├─ infra/
│  ├─ docker/
│  └─ mysql/
└─ docs/
   ├─ architecture/
   ├─ data-dictionary/
   └─ runbooks/
```

## Table-to-module ownership

| Module | Tables |
| --- | --- |
| `auth` | `auth_sessions`, `password_reset_tokens`, `login_attempts` |
| `users` | `users` |
| `rbac` | `roles`, `permissions`, `role_permissions` |
| `uploads` | `upload_batches`, `upload_batch_rows`, `upload_validation_errors` |
| `imports` | `investment_records`, `idempotency_keys` |
| `investments` | `investment_records` |
| `integrations` | `integration_sources` |
| `sync` | `sync_batches`, `sync_batch_errors` |
| `reports` | `report_exports` |
| `audit` | `audit_logs` |
| `outbox` | `outbox_events` |
| `jobs` | `job_history` |
| `settings` | `system_settings`, `tenor_bands`, `source_channels` |

## Implementation sequence

1. Install workspace dependencies and validate TypeScript compilation for `apps/api` and `apps/worker`.
2. Add infrastructure adapters for MySQL, Redis, object storage, and configuration.
3. Implement concrete repository classes behind the interfaces generated in `apps/api/src/modules/**/interfaces`.
4. Add DTOs, guards, validators, and policies per module.
5. Register worker processors and schedulers against the queue contracts in `apps/worker/src/queues`.
6. Add the frontend dashboard app once API contracts stabilize.

## Migration test path

Use [docs/runbooks/local-development.md](docs/runbooks/local-development.md) as the source of truth for local MySQL and Redis startup, migration application, and schema verification.