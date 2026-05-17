# WealthTrack

This repository is scaffolded as a modular monorepo for the WealthTrack platform.

## Structure

- `apps/api`: NestJS HTTP API
- `apps/worker`: NestJS background worker
- `apps/dashboard`: Vite React admin console
- `packages/config`: shared configuration helpers
- `packages/shared-types`: shared row and repository contract types
- `infra/docker`: local MySQL and Redis stack
- `infra/mysql/migrations`: forward-only MySQL migration set
- `docs/architecture`: implementation and scaffolding plans
- `docs/runbooks`: local setup and migration verification instructions

## Environment promotion

- `staging` branch deploys to the staging environment.
- `main` branch deploys to production.
- Staging and production must use separate databases, Redis instances, secrets, and hostnames.
- See `docs/runbooks/staging-environment.md` for the full staging workflow, branch policy, and deployment setup.

## Local workflow

1. Copy `.env.example` to `.env` if you want to override defaults.
2. Run `npm run docker:up`.
3. Run `npm run db:migrate`.
4. Run `npm run test:integration` to verify repository methods against the local migrated schema.
5. Run `npm run dev` to start the API, worker, and dashboard from the repo root.
6. If you only need one process, use `npm run dev:api`, `npm run dev:worker`, or `npm run dev:dashboard`.
7. Follow the runbook in `docs/runbooks/local-development.md`.

## Worker queues

The worker registers BullMQ processors for:

- `csv-processing`
- `import`
- `reports`
- `sync`
- `notification`
- `outbox`

The queue contracts live under `apps/worker/src/queues`, and the concrete processor implementations live under `apps/worker/src/processors`.
