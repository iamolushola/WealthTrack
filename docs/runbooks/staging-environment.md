# Staging Environment

This runbook defines a staging environment that stays operationally separate from production.

## Objectives

- keep staging and production on different branches
- use separate hosts, databases, Redis instances, and environment files
- validate every change in CI before deployment
- auto-deploy `staging` and promote to production only from `main`

## Repository files added for staging

- `.env.staging.example`: staging-only environment template
- `.env.production.example`: production-only environment template
- `infra/docker/docker-compose.staging.yml`: runtime stack for API, worker, dashboard, MySQL, and Redis
- `apps/api/Dockerfile`: API container build
- `apps/worker/Dockerfile`: worker container build
- `apps/dashboard/Dockerfile`: dashboard container build
- `apps/dashboard/nginx.conf`: SPA serving config for the dashboard
- `.github/workflows/ci.yml`: pull request validation for `staging` and `main`
- `.github/workflows/deploy-staging.yml`: image build and deploy pipeline for staging
- `.github/workflows/deploy-production.yml`: image build and deploy pipeline for production

## Recommended branch strategy

1. Protect `main` and `staging` in GitHub.
2. Create feature branches from `staging`.
3. Open pull requests into `staging` for all pre-production testing.
4. Let `staging` auto-deploy after merge.
5. Promote tested changes by opening a pull request from `staging` into `main`.
6. Let `main` auto-deploy to production only after review approval.

This keeps production promotion explicit. `staging` is the integration branch. `main` is the release branch.

## Environment separation rules

Use distinct values for all of the following:

- database name
- database credentials
- Redis instance
- hostnames
- API base URL
- SSH host and SSH key
- GitHub Environment secrets

Do not reuse `.env.staging` for production. Do not point staging at production data.

## Step-by-step setup

### 1. Provision a dedicated staging host

Use a separate VM or container host from production. Minimum runtime on the host:

- Docker Engine with Compose plugin
- Git
- SSH access for GitHub Actions deploy key

Recommended directories:

- staging: `/opt/wealthtrack-staging`
- production: `/opt/wealthtrack-production`

### 2. Clone the repository on the staging host

```bash
sudo mkdir -p /opt/wealthtrack-staging
sudo chown "$USER":"$USER" /opt/wealthtrack-staging
git clone https://github.com/Olusholaas/WealthTrack.git /opt/wealthtrack-staging
cd /opt/wealthtrack-staging
git checkout staging
```

### 3. Create the staging environment file

```bash
cp .env.staging.example .env.staging
```

Fill in real staging-only values:

- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- `VITE_API_BASE_URL`

Keep `MYSQL_HOST=mysql` and `REDIS_HOST=redis` when using the included compose stack.

### 4. Start the staging stack manually once

```bash
docker compose --env-file .env.staging -f infra/docker/docker-compose.staging.yml up -d mysql redis
docker compose --env-file .env.staging -f infra/docker/docker-compose.staging.yml up -d api worker dashboard
```

### 5. Apply migrations in staging

```bash
sh infra/mysql/apply-migrations.sh
```

If you want migrations to always target staging, run them with the staging env file loaded in the shell first:

```bash
set -a
. ./.env.staging
set +a
COMPOSE_FILE=infra/docker/docker-compose.staging.yml sh infra/mysql/apply-migrations.sh
```

### 6. Verify the deployed services

Check the API:

```bash
curl http://127.0.0.1:3000/api/v1/health/ready
```

Check the dashboard:

```bash
curl -I http://127.0.0.1:8080
```

Check containers:

```bash
docker compose --env-file .env.staging -f infra/docker/docker-compose.staging.yml ps
```

### 7. Configure GitHub branch protections

For `staging`:

- require pull request before merge
- require `CI` workflow to pass
- optionally allow auto-merge after approval

For `main`:

- require pull request before merge
- require `CI` workflow to pass
- require at least one approval
- optionally restrict direct pushes to admins only

### 8. Configure GitHub Environments and secrets

Create two GitHub Environments:

- `staging`
- `production`

Required staging secrets:

- `STAGING_HOST`
- `STAGING_USER`
- `STAGING_SSH_KEY`
- `STAGING_GHCR_USERNAME`
- `STAGING_GHCR_TOKEN`
- `STAGING_VITE_API_BASE_URL`

Required production secrets:

- `PRODUCTION_HOST`
- `PRODUCTION_USER`
- `PRODUCTION_SSH_KEY`
- `PRODUCTION_GHCR_USERNAME`
- `PRODUCTION_GHCR_TOKEN`
- `PRODUCTION_VITE_API_BASE_URL`

Use GHCR credentials that can pull private package images from the remote host. Do not rely on the workflow token for the SSH session.

### 9. Activate the pipelines

The repository now has three workflows:

- `CI`: runs on pull requests into `staging` and `main`
- `Deploy Staging`: runs on pushes to `staging`
- `Deploy Production`: runs on pushes to `main`

Expected promotion path:

1. developer opens PR into `staging`
2. `CI` passes
3. merge into `staging`
4. staging images build and deploy
5. business or QA sign-off happens in staging
6. PR from `staging` to `main`
7. `CI` passes again
8. merge into `main`
9. production deploy runs

## Environment variable handling recommendations

- commit only example files such as `.env.staging.example`
- never commit real `.env.staging` or `.env.production`
- store deploy host credentials in GitHub Environments, not in repository files
- keep staging API URLs and production API URLs separate at build time for the dashboard
- keep staging and production database credentials different even if they live on different hosts

## Deployment pipeline recommendations

- build immutable Docker images in CI
- tag staging images with `staging`
- tag production images with `production`
- deploy using `docker compose pull && docker compose up -d`
- run migrations after image rollout but before business validation
- keep the worker as a separate service so queue processing can be restarted independently of the API

## Production separation recommendations

- separate host or cluster from staging
- separate GHCR tag from staging
- separate `.env.production`
- separate MySQL volume and Redis volume
- separate DNS names such as:
  - staging: `staging.wealthtrack.example.com`
  - production: `wealthtrack.example.com`

## Notes for this repository

- the API now supports `PORT`, which is useful for container runtime control
- the dashboard still relies on compile-time `VITE_API_BASE_URL`, so build staging and production images with different values
- the included staging compose file is also used by the production workflow with a different env file, which keeps the runtime shape identical across environments while preserving secret and data separation