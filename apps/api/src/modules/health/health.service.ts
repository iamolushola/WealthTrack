import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  liveness(): { status: string; version: string } {
    return { status: 'ok', version: process.env.APP_VERSION ?? 'dev' };
  }

  readiness(): { status: string; dependencies: string[] } {
    return {
      status: 'ready',
      dependencies: ['mysql', 'redis', 'object-storage'],
    };
  }
}
