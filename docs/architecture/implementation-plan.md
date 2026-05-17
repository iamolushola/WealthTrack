# WealthTrack Implementation Plan

## Objective

Deliver WealthTrack as a modular monolith first platform on NestJS, MySQL, Redis, BullMQ, object storage, and a dashboard web application. The implementation plan below is structured to keep module boundaries extraction-ready while ensuring the first release produces auditable, reconcilable analytics from confirmed valid investment records only.

## Architecture baseline

### Runtime shape

- `apps/api`: NestJS HTTP API for auth, RBAC, uploads, dashboards, reports, integrations, settings, and audit access
- `apps/worker`: NestJS worker for CSV processing, import confirmation, sync jobs, report generation, notifications, and outbox dispatch
- `apps/dashboard`: React, Next.js, or Vue dashboard application aligned to role-specific navigation
- `infra/mysql`: forward-only schema migrations
- `infra/redis`: queue and lock infrastructure
- object storage: private uploaded CSVs, error reports, and export artifacts

### Module boundaries

Each backend module should follow the target contract and own its use cases, DTOs, validators, policies, and persistence abstraction.

| Module | Owns | Depends on |
| --- | --- | --- |
| `auth` | login, logout, refresh, reset | `users`, `rbac`, `audit` |
| `users` | user management | `rbac`, `audit` |
| `rbac` | roles, permissions, guards, decorators | none |
| `uploads` | file upload, history, preview | `validation`, `imports`, `audit`, `jobs` |
| `validation` | row validation, duplicate checks | `fund-classification`, `tenor-classification`, `settings` |
| `imports` | confirm import transaction | `investments`, `audit`, `outbox`, `jobs` |
| `investments` | canonical investment facts | none |
| `analytics` | dashboard queries and calculations | `investments`, `settings` |
| `reports` | export requests and downloads | `analytics`, `audit`, `jobs` |
| `integrations` | source configuration and tests | `sync`, `audit`, `settings` |
| `sync` | manual and scheduled pull workflows | `integrations`, `validation`, `imports`, `jobs`, `audit` |
| `audit` | append-only audit writer and search APIs | none |
| `settings` | system settings, tenor bands, channels | `audit` |
| `notifications` | user-facing status alerts | `outbox`, `jobs` |
| `outbox` | transactional event persistence | none |
| `jobs` | queue registration and execution tracking | none |

## Delivery phases

### Phase 1: foundations

Scope:

- initialize monorepo layout under `apps`, `packages`, `infra`, and `docs`
- bootstrap API app with config, validation, OpenAPI, logging, correlation IDs, health endpoints
- bootstrap worker with BullMQ and Redis
- apply migrations `0001` through `0009`
- implement `auth`, `rbac`, `users`, `audit`, and `jobs` module skeletons

Acceptance criteria:

- health endpoints report MySQL and Redis readiness
- seeded roles and permissions are available
- login, logout, refresh, and `GET /api/v1/auth/me` work with RBAC-aware responses
- privileged actions produce audit entries with actor, IP, user agent, action, outcome, and correlation ID

### Phase 2: upload and validation core

Scope:

- implement signed object-storage upload flow and CSV ingestion entrypoint
- create upload batch row, store file metadata, enqueue `ProcessCsvUploadJob`
- build validation pipeline for required fields, types, enums, tenor classification, fund classification, duplicate checks, and preview persistence
- generate downloadable validation error reports

Acceptance criteria:

- only `.csv` files with approved size and schema are accepted
- preview shows valid, invalid, duplicate, and skipped rows without mutating dashboards
- uploaders can only see their own batches unless acting as admin
- failed validation and processing outcomes are visible in UI and persisted in audit and job history

### Phase 3: investment data core

Scope:

- implement import confirmation endpoint with idempotency enforcement
- insert only valid staged rows into `investment_records` inside a transaction
- write `investment.import.confirmed` or partial confirmation outbox events in the same transaction
- expose search and customer-history read APIs

Acceptance criteria:

- duplicate prevention blocks double counting by reference or source hash
- confirmation is idempotent and auditable
- records carry `data_source`, batch linkage, and confirmer identity
- dashboards still exclude rows not in `record_status = 'valid'` and `import_status = 'confirmed'`

### Phase 4: dashboards and analytics

Scope:

- implement central calculation service plus summary, trends, customer portfolio, and wealth manager query services
- add filter DTOs for date, customer type, fund type, tenor, relationship manager, and source channel
- expose dashboard APIs and cached query patterns where safe

Acceptance criteria:

- formulas are centralized and reused by exports
- analytics reconcile exactly with confirmed records in MySQL
- query plans use the designed composite indexes, not table scans, for expected reporting paths

### Phase 5: reporting and exports

Scope:

- implement async export request flow backed by `report_exports` and BullMQ
- generate CSV and Excel files first; reserve PDF for a later slice behind the same contract
- secure downloads through signed URLs and permission checks

Acceptance criteria:

- heavy exports run off-request
- report history is queryable by requester
- export request, completion, and download are audited

### Phase 6: secure integrations

Scope:

- implement API and read-only database integration setup
- store only secret references in MySQL; real credentials remain in a vault or secret manager
- add test-connection, manual sync, and scheduled sync flows
- route synced records through the same validation and import pipeline used for CSVs

Acceptance criteria:

- no frontend path can read or write raw integration credentials
- database integrations are confirmed read-only before activation
- sync failures preserve invalid payload traces in `sync_batch_errors` and audit logs

### Phase 7: hardening and scale readiness

Scope:

- performance-test large uploads, report jobs, and dashboard filters
- validate dead-letter replay tooling and reason capture
- add observability dashboards for API latency, queue lag, failures, and database hotspots
- perform security review and reconciliation UAT

Acceptance criteria:

- SLA alerts exist for upload processing, sync processing, and export generation
- DLQ replay requires admin permission and produces audit logs
- reconciliation tests prove dashboard figures match export figures for the same filters

## Database implementation strategy

### Migration order

Use the forward-only migrations under [infra/mysql/migrations/0001_foundation_users_roles_permissions.sql](infra/mysql/migrations/0001_foundation_users_roles_permissions.sql) through [infra/mysql/migrations/0009_indexes_constraints.sql](infra/mysql/migrations/0009_indexes_constraints.sql).

Key reasons for the ordering:

1. RBAC must exist before any privileged workflows are exercised.
2. Upload staging must exist before imports because dashboards cannot read raw files.
3. Reporting, audit, and jobs depend on prior business aggregates and request tracing.
4. Settings and tenor bands come late in DDL order but early in application bootstrap because validation uses them.

### Transaction boundaries

Apply these rules consistently:

- upload creation: `upload_batches` row plus initial audit entry
- import confirmation: staged row reads, `investment_records` inserts or updates, `upload_batches` status update, audit row, and outbox insert in one transaction
- report request: `report_exports` row and outbox insert in one transaction
- sync completion: `sync_batches` final status, imported records, audit row, and outbox insert in one transaction

### Query discipline

- all analytics and export repositories must share a single reusable predicate for valid confirmed records
- authorization must be enforced both in route guards and repository filters for ownership-scoped resources
- do not compute business totals from staging tables, raw object storage files, or failed sync payloads

## API and worker implementation sequence

### API first slice

Implement in this order:

1. auth and RBAC primitives
2. user management
3. uploads create, preview, history, confirm, cancel
4. dashboards
5. reports
6. integrations and sync control
7. audit search and export

### Worker first slice

Implement in this order:

1. `ProcessCsvUploadJob`
2. `GenerateUploadErrorReportJob`
3. `ConfirmImportJob`
4. `GenerateReportJob`
5. `ManualSyncJob`
6. `ScheduledSyncJob`
7. `DispatchOutboxEventJob`
8. notification jobs

Each worker job should hydrate a standard execution context carrying `job_id`, `request_id`, `correlation_id`, `actor_snapshot`, `source_type`, `batch_id`, and timestamps so API and worker traces remain connected.

## Frontend implementation sequence

### Role-oriented routing

- admin: dashboards, uploads, reports, integrations, users, audit logs, settings
- analyst: dashboards and reports only
- uploader: upload, preview, errors, and personal upload history only

### Delivery order

1. auth shell and permission-aware navigation
2. upload flow and preview UX
3. summary and trends dashboards
4. customer portfolio and wealth manager dashboards
5. reports
6. users, integrations, audit logs, settings

## Testing plan

### Required test layers

- unit tests for validators, policies, calculation service, and classification logic
- integration tests for repositories, migrations, and transaction boundaries
- contract tests for API envelopes and permission behavior
- E2E tests for login, upload validation, import confirmation, dashboard reconciliation, report export, and sync trigger flows

### High-risk scenarios to lock down early

- duplicate upload row should not create duplicate confirmed investment
- uploader must not access analytics endpoints
- analyst must not confirm imports or trigger syncs
- export filters must match dashboard totals for the same filter set
- sync retry and DLQ replay must not double-insert investment facts

## Operational plan

### Environment dependencies

- MySQL 8.0+ with strict SQL mode enabled
- Redis for BullMQ, locks, and ephemeral coordination
- private object storage with signed URL support
- secret manager or vault for integration credentials
- structured logging pipeline with correlation ID support

### Observability minimums

- API latency, error rate, and auth failure rate
- queue depth, queue lag, retry count, and DLQ count
- upload processing duration and failure rate
- sync duration, invalid-record rate, and success rate
- export generation duration and failure rate
- slow dashboard query logging

## Recommended next build artifacts

After approving this plan, the next concrete deliverables should be:

1. monorepo scaffolding with `apps/api`, `apps/worker`, and `apps/dashboard`
2. NestJS module skeletons and shared config package
3. migration runner wiring and local Docker Compose for MySQL and Redis
4. OpenAPI-first DTO contracts for auth, uploads, dashboards, reports, and integrations