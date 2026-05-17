# WealthTrack Database Schema

## Purpose

This schema defines the MySQL 8.0+ persistence baseline for the WealthTrack modular monolith. It is designed to support the NestJS API and worker applications, enforce RBAC and auditability, protect dashboard correctness, and keep extraction boundaries clear for uploads, reporting, integrations, and async processing.

## Design Rules

- Primary keys use UUID v7 generated in the application layer and stored as `CHAR(36)`.
- Monetary values use `DECIMAL(19,4)` and rates use `DECIMAL(9,6)`.
- Timestamps use UTC `DATETIME(3)`.
- Files are stored in object storage and referenced by URL or object key only.
- Dashboard queries must read only rows where `investment_records.record_status = 'valid'` and `investment_records.import_status = 'confirmed'`.
- Secrets are not stored in plaintext. Integration rows hold a vault reference via `secret_ref` plus non-sensitive connection metadata.
- Request traceability is preserved with `request_id`, `correlation_id`, actor references, and job metadata.

## Schema Overview

### Identity and access

| Table | Purpose |
| --- | --- |
| `roles` | Role catalog for admin, analyst, uploader |
| `permissions` | Permission catalog keyed by code |
| `role_permissions` | Many-to-many mapping of roles to permissions |
| `users` | Internal platform users |
| `auth_sessions` | Refresh session persistence and revocation |
| `password_reset_tokens` | Password reset workflow support |
| `login_attempts` | Authentication audit and rate-limit analysis |

The model intentionally keeps `users.role_id` as the primary assignment mechanism to align with the target architecture. Fine-grained enforcement still happens through permission checks, not role string comparisons.

### Upload and validation

| Table | Purpose |
| --- | --- |
| `upload_batches` | One row per uploaded CSV and lifecycle state |
| `upload_batch_rows` | Parsed preview rows used for review before confirmation |
| `upload_validation_errors` | Field-level validation errors for preview and downloadable error reports |

`upload_batch_rows` is the staging boundary between raw CSV input and confirmed investments. It exists because previewing only errors is insufficient for import confirmation, partial import support, or duplicate review.

### Investments and idempotency

| Table | Purpose |
| --- | --- |
| `investment_records` | Confirmed and tracked investment facts used by dashboards and exports |
| `idempotency_keys` | Request-level idempotency for import confirmation, sync triggers, and exports |

Important domain additions:

- `import_status` was added because dashboard rules require both data validity and confirmation status.
- `source_record_hash` supports duplicate detection across CSV uploads and external syncs.
- `upload_batch_row_id` gives end-to-end traceability from a confirmed investment back to its preview row.

### Integrations and sync

| Table | Purpose |
| --- | --- |
| `integration_sources` | Configured API or read-only database integrations |
| `sync_batches` | One row per sync execution |
| `sync_batch_errors` | Invalid or failed source payload records |

The `integration_sources.secret_ref` column is the only place credentials are referenced. The actual secret must live in a secret manager or vault.

### Reporting, audit, async

| Table | Purpose |
| --- | --- |
| `report_exports` | Report request and artifact metadata |
| `audit_logs` | Immutable business and administrative audit history |
| `outbox_events` | Reliable event persistence for transactional async dispatch |
| `job_history` | BullMQ execution history and DLQ visibility |

### Settings and classifications

| Table | Purpose |
| --- | --- |
| `system_settings` | Key-value system configuration |
| `tenor_bands` | Configurable tenor classification rules |
| `source_channels` | Allowed source channel catalog |

`tenor_bands` is seeded with the specified business ranges: 30-120, 150-210, 240-360, and 390-480 days.

## Key Constraints

### Financial correctness

- `investment_amount > 0`
- `tenor_days > 0`
- one investment reference or source hash should not be counted twice
- analytics must never read preview rows or invalid rows

### Security and control

- `users.email` is unique for login lookup
- `role_permissions(role_id, permission_id)` is unique
- sessions, password resets, and idempotency keys are time-bound and queryable by status
- all privileged actions can be traced through `audit_logs`

### Operational traceability

- each job row stores queue name, job name, request, correlation, actor snapshot, and source type
- upload batches, sync batches, and report exports all carry lifecycle timestamps and counters
- outbox events carry versioning and retry metadata so reporting, notification, or integration concerns can later be extracted cleanly

## Query Rules

### Dashboard source of truth

Use the following predicate in every analytics query and in export services that must mirror dashboard values:

```sql
WHERE record_status = 'valid'
  AND import_status = 'confirmed'
```

### Duplicate detection

Apply duplicate detection in this order:

1. `investment_reference` when available
2. `source_record_hash` for rows without a stable external reference
3. staging-time duplicate flags in `upload_batch_rows` and `sync_batch_errors`

### Ownership-scoped upload history

Uploader queries should always scope by `upload_batches.uploaded_by = :actor_id` unless the actor has an admin permission path.

## Migration Layout

The migration set under [infra/mysql/migrations/0001_foundation_users_roles_permissions.sql](infra/mysql/migrations/0001_foundation_users_roles_permissions.sql) through [infra/mysql/migrations/0009_indexes_constraints.sql](infra/mysql/migrations/0009_indexes_constraints.sql) follows the requested domain ordering:

1. identity and RBAC
2. upload staging
3. investment facts
4. integrations and sync
5. reporting
6. audit
7. outbox and jobs
8. settings and classification rules
9. indexes and late-bound constraints

## Mapping to NestJS modules

| Module | Primary tables |
| --- | --- |
| `auth` | `users`, `auth_sessions`, `password_reset_tokens`, `login_attempts` |
| `users` | `users`, `roles`, `permissions`, `role_permissions` |
| `uploads` | `upload_batches`, `upload_batch_rows`, `upload_validation_errors` |
| `validation` | `upload_batch_rows`, `upload_validation_errors`, `sync_batch_errors` |
| `imports` | `investment_records`, `idempotency_keys` |
| `investments` | `investment_records` |
| `analytics` | `investment_records`, `tenor_bands`, `source_channels` |
| `reports` | `report_exports`, `audit_logs` |
| `integrations` | `integration_sources`, `sync_batches`, `sync_batch_errors` |
| `sync` | `sync_batches`, `integration_sources`, `investment_records` |
| `audit` | `audit_logs` |
| `outbox` | `outbox_events` |
| `jobs` | `job_history` |
| `settings` | `system_settings`, `tenor_bands`, `source_channels` |

## Open implementation notes

- MySQL cannot enforce row immutability for `audit_logs`; immutability must be guaranteed by application policy and database permissions.
- If file retention needs legal hold semantics later, add lifecycle metadata to object storage first, not blobs to MySQL.
- If a single role per user becomes too limiting, evolve `users.role_id` to a join table in a later migration without changing permission enforcement semantics.