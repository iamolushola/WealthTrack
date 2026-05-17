import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  readiness(): { status: string; dependencies: string[] } {
    return {
      status: 'ready',
      dependencies: ['mysql', 'redis', 'object-storage'],
    };
  }
}
