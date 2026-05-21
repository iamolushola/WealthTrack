# Staging Deployment

## Overview

| Item | Value |
|---|---|
| Staging URL | https://wealthtrack.credpal.xyz |
| Branch | `staging` |
| Registry | `ghcr.io/iamolushola/` |
| Compose file | `infra/docker/docker-compose.staging.yml` |
| Deploy path on host | `/opt/wealthtrack-staging/` |

## Trigger

- **Auto**: push to `staging` branch
- **Manual**: Actions → "Deploy • Staging" → Run workflow (optional `ref` override and `force_redeploy` toggle)
- **PR checks only** (no deploy): any pull request targeting `staging` runs `staging-pr-validate.yml`

## Job graph

```
validate → build-api ─┐
         → build-worker─┤→ deploy → health-check → notify
         → build-dashboard┘              │
                                    rollback (on failure) → notify
```

## Secret and variable provisioning

Run these once to configure the repository. Replace `<VALUE>` with real values.

```sh
# Repository secrets
gh secret set STAGING_HOST            --body "<vps-ip-or-hostname>"
gh secret set STAGING_USER            --body "<ssh-username>"
gh secret set STAGING_SSH_KEY         < /path/to/staging_rsa
gh secret set STAGING_GHCR_USERNAME   --body "<github-username>"
gh secret set STAGING_GHCR_TOKEN      --body "<ghcr-pat-read-packages>"
gh secret set STAGING_VITE_API_BASE_URL --body "https://<api-host>/api/v1"
gh secret set SLACK_WEBHOOK_URL       --body "<slack-incoming-webhook-url>"  # optional

# Repository variables
gh variable set STAGING_URL           --body "https://wealthtrack.credpal.xyz"
# Set STAGING_API_URL only if the API is on a different origin than STAGING_URL
# gh variable set STAGING_API_URL     --body "http://<vps-ip>:3000"
```

## Health check

The health check probes `$STAGING_API_URL/api/v1/health/live` (falls back to `$STAGING_URL/api/v1/health/live`).

Expected response: `{"status":"ok","version":"<git-sha>"}`.

The SHA must match `${{ github.sha }}` for the probe to pass. This prevents false-positives from the previous deployment still serving traffic.

10 attempts × 6 seconds = 60-second grace window.

## Rollback runbook

**Automatic rollback** fires when the health check job fails after a successful deploy. It:
1. SSHes into the staging host
2. Rewrites `GHCR_IMAGE_TAG` in `.env.staging` to the previously-running SHA
3. Runs `docker compose pull && up -d`
4. Re-probes the health endpoint

**Manual rollback** (if the automated rollback fails):
```sh
ssh $STAGING_USER@$STAGING_HOST
cd /opt/wealthtrack-staging

# List available image tags
docker images | grep wealthtrack

# Revert to a known-good SHA
sed -i "s/^GHCR_IMAGE_TAG=.*/GHCR_IMAGE_TAG=<previous-sha>/" .env.staging
docker compose --env-file .env.staging -f infra/docker/docker-compose.staging.yml pull
docker compose --env-file .env.staging -f infra/docker/docker-compose.staging.yml up -d
```

## Database migrations

Migrations run **automatically** during every staging deploy, before the API container starts. The migration script (`infra/mysql/apply-migrations.sh`) applies all SQL files in `infra/mysql/migrations/` sequentially. All migrations are written to be idempotent (`CREATE TABLE IF NOT EXISTS`, `INSERT IGNORE`).

## Not in scope

- Production deploy pipeline (covered by `deploy-production.yml`)
- IaC / provisioning of the staging VPS or DNS
- Automated staging environment teardown
- Integration or end-to-end tests in CI (no test infra available on runners)

## On-call contact

See the `CODEOWNERS` file for reviewers. Escalate via the project Slack channel.
