import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  liveness(): { status: string } {
    return this.healthService.liveness();
  }

  @Get('ready')
  readiness(): { status: string; dependencies: string[] } {
    return this.healthService.readiness();
  }
}
