import { Controller, Get, HttpCode, HttpException, HttpStatus } from '@nestjs/common';
import { HealthService, ReadinessResult } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /** Liveness — is the process alive? Use this as Vesta's health check path. */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  liveness(): { status: string; version: string } {
    return this.healthService.liveness();
  }

  /** Readiness — are all dependencies reachable? Returns 503 when degraded. */
  @Get('ready')
  async readiness(): Promise<ReadinessResult> {
    const result = await this.healthService.readiness();
    if (result.status !== 'ready') {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}
