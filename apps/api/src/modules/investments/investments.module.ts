import { Module } from '@nestjs/common';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';
import { InvestmentsPolicy } from './policies/investments.policy';
import { MysqlInvestmentRecordRepository } from './repositories/mysql-investments.repository';

@Module({
  controllers: [InvestmentsController],
  providers: [InvestmentsService, InvestmentsPolicy, MysqlInvestmentRecordRepository],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}
