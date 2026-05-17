# Local Development

## Local services

The local stack runs MySQL 8 and Redis using [infra/docker/docker-compose.local.yml](infra/docker/docker-compose.local.yml).

### Start infrastructure

```bash
npm run docker:up
```

Default local host ports are `3307` for MySQL and `6380` for Redis to reduce collisions with existing local services. Override them in `.env` if needed.

### Apply migrations

```bash
npm run db:migrate
```

This executes each SQL file in [infra/mysql/migrations/0001_foundation_users_roles_permissions.sql](infra/mysql/migrations/0001_foundation_users_roles_permissions.sql) through [infra/mysql/migrations/0009_indexes_constraints.sql](infra/mysql/migrations/0009_indexes_constraints.sql) against the local MySQL container.

### Verify the schema

```bash
docker compose -f infra/docker/docker-compose.local.yml exec mysql \
  mysql -uroot -proot -e "USE wealthtrack; SHOW TABLES;"
```

```bash
docker compose -f infra/docker/docker-compose.local.yml exec mysql \
  mysql -uroot -proot -e "USE wealthtrack; SELECT code FROM roles ORDER BY code;"
```

### Reset the database

```bash
npm run db:reset
npm run db:migrate
```

## Expected migration test outcome

- MySQL container reports healthy
- Redis container reports healthy
- all tables in the schema exist
- seeded roles return `admin`, `analyst`, and `uploader`
- seeded permissions return the requested baseline permission codes

## Start the applications

Run both long-lived processes from the repo root:

```bash
npm run dev
```

This starts:

- the API with Nest watch mode
- the worker with `tsx watch`

If you only need one process, use:

```bash
npm run dev:api
npm run dev:worker
```