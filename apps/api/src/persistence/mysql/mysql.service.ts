import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createPool, Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { toCamelCaseRow, toCamelCaseRows, toSnakeCaseRecord } from './mysql-row-mapper';

function normalizeParams(params: unknown[]): unknown[] {
  return params.map((param) => {
    if (param && typeof param === 'object' && !Array.isArray(param) && !(param instanceof Date)) {
      return toSnakeCaseRecord(param as Record<string, unknown>);
    }

    return param;
  });
}

@Injectable()
export class MysqlService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;

  async onModuleInit(): Promise<void> {
    this.pool = createPool({
      host: process.env.MYSQL_HOST ?? '127.0.0.1',
      port: Number(process.env.MYSQL_PORT ?? 3307),
      user: process.env.MYSQL_USER ?? 'root',
      password: process.env.MYSQL_PASSWORD ?? process.env.MYSQL_ROOT_PASSWORD ?? 'root',
      database: process.env.MYSQL_DATABASE ?? 'wealthtrack',
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: false,
    });

    await this.pool.query('SELECT 1');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  async selectMany<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(sql, normalizeParams(params));
    return toCamelCaseRows<T>(rows as unknown as Record<string, unknown>[]);
  }

  async selectOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(sql, normalizeParams(params));
    const firstRow = (rows as unknown as Record<string, unknown>[])[0];
    return firstRow ? toCamelCaseRow<T>(firstRow) : null;
  }

  async execute(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
    const [result] = await this.pool.query<ResultSetHeader>(sql, normalizeParams(params));
    return result;
  }
}
