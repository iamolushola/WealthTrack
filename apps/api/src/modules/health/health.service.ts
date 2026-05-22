import { Injectable } from '@nestjs/common';
import { MysqlService } from '../../persistence/mysql/mysql.service';
import IORedis from 'ioredis';

export interface DependencyStatus {
  mysql: 'ok' | 'error';
  redis: 'ok' | 'error';
}

export interface ReadinessResult {
  status: 'ready' | 'degraded';
  version: string;
  dependencies: DependencyStatus;
}

@Injectable()
export class HealthService {
  private readonly redis = new IORedis({
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6380),
    username: process.env.REDIS_USER,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    lazyConnect: true,
  });

  constructor(private readonly mysql: MysqlService) {}

  liveness(): { status: string; version: string } {
    return { status: 'ok', version: process.env.APP_VERSION ?? 'dev' };
  }

  async readiness(): Promise<ReadinessResult> {
    const [mysqlOk, redisOk] = await Promise.all([
      this.mysql.selectOne('SELECT 1 AS ok', []).then(() => true).catch(() => false),
      this.redis.ping().then((r) => r === 'PONG').catch(() => false),
    ]);

    return {
      status: mysqlOk && redisOk ? 'ready' : 'degraded',
      version: process.env.APP_VERSION ?? 'dev',
      dependencies: {
        mysql: mysqlOk ? 'ok' : 'error',
        redis: redisOk ? 'ok' : 'error',
      },
    };
  }
}
