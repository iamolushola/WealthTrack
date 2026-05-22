import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createConnection, RowDataPacket } from 'mysql2/promise';

/**
 * Runs any pending SQL migration files from infra/mysql/migrations on startup.
 *
 * Tracks applied migrations in a `schema_migrations` table.
 * Uses a dedicated connection with multipleStatements enabled so each .sql
 * file is executed as a single call — no fragile statement splitting.
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
        await conn.query(sql);
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
