import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createConnection, RowDataPacket } from 'mysql2/promise';

// MySQL error numbers that mean "this DDL was already applied" — safe to skip.
// 1050: ER_TABLE_EXISTS_ERROR       (CREATE TABLE … already exists)
// 1060: ER_DUP_FIELDNAME            (ADD COLUMN … already exists)
// 1061: ER_DUP_KEYNAME              (ADD INDEX … already exists)
// 1091: ER_CANT_DROP_FIELD_OR_KEY   (DROP INDEX/KEY … doesn't exist)
// 3940: ER_CONSTRAINT_NOT_FOUND     (DROP CONSTRAINT … doesn't exist)
const ALREADY_APPLIED_ERRNO = new Set([1050, 1060, 1061, 1091, 3940]);

/**
 * Runs any pending SQL migration files from infra/mysql/migrations on startup.
 *
 * Tracks applied migrations in a `schema_migrations` table.
 * Uses a dedicated connection with multipleStatements enabled so each .sql
 * file is executed as a single call — no fragile statement splitting.
 *
 * Brownfield-safe: if a migration fails because a table/column/index already
 * exists (errno 1050/1060/1061), it is treated as already applied and skipped.
 * Any other error aborts startup so genuine mistakes are never silently swallowed.
 *
 * This service initialises BEFORE the rest of the application because it is
 * declared in MysqlModule which is imported first by AppModule.
 */
@Injectable()
export class MigrationService implements OnModuleInit {
  private readonly logger = new Logger(MigrationService.name);

  async onModuleInit(): Promise<void> {
    const conn = await createConnection({
      host: process.env.MYSQL_HOST ?? '127.0.0.1',
      port: Number(process.env.MYSQL_PORT ?? 3307),
      user: process.env.MYSQL_USER ?? 'root',
      password: process.env.MYSQL_PASSWORD ?? process.env.MYSQL_ROOT_PASSWORD ?? 'root',
      database: process.env.MYSQL_DATABASE ?? 'wealthtrack',
      multipleStatements: true,
    });

    try {
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          filename   VARCHAR(255) NOT NULL PRIMARY KEY,
          applied_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const migrationsDir = path.join(process.cwd(), 'infra/mysql/migrations');

      let files: string[];
      try {
        files = (await fs.readdir(migrationsDir))
          .filter((f) => f.endsWith('.sql'))
          .sort();
      } catch {
        this.logger.warn(`Migrations directory not found at ${migrationsDir} — skipping`);
        return;
      }

      const [rows] = await conn.query<RowDataPacket[]>(
        'SELECT filename FROM schema_migrations',
      );
      const applied = new Set((rows as { filename: string }[]).map((r) => r.filename));

      let count = 0;
      for (const filename of files) {
        if (applied.has(filename)) continue;

        this.logger.log(`Applying migration: ${filename}`);
        const sql = await fs.readFile(path.join(migrationsDir, filename), 'utf-8');

        try {
          await conn.query(sql);
        } catch (err: unknown) {
          const errno: number | undefined = (err as { errno?: number }).errno;
          if (errno !== undefined && ALREADY_APPLIED_ERRNO.has(errno)) {
            // The DDL in this file already exists in the DB — treat as applied.
            this.logger.warn(
              `Migration ${filename} skipped (errno ${errno}: schema already present) — marking as applied`,
            );
          } else {
            // Genuine failure — crash startup so the issue is visible immediately.
            throw err;
          }
        }

        await conn.execute('INSERT INTO schema_migrations (filename) VALUES (?)', [filename]);
        count++;
        this.logger.log(`Migration applied: ${filename}`);
      }

      if (count === 0) {
        this.logger.log('Database schema is up to date');
      } else {
        this.logger.log(`Applied ${count} migration(s) successfully`);
      }
    } finally {
      await conn.end();
    }
  }
}
