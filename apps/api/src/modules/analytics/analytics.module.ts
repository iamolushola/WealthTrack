import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { MysqlAnalyticsInvestmentRepository, MysqlAnalyticsReferenceRepository } from './repositories/mysql-analytics.repositories';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, MysqlAnalyticsInvestmentRepository, MysqlAnalyticsReferenceRepository],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
