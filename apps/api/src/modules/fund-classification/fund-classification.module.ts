import { Module } from '@nestjs/common';
import { FundClassificationService } from './fund-classification.service';
import { MysqlFundClassificationSettingsRepository } from './repositories/mysql-fund-classification.repository';

@Module({
  providers: [FundClassificationService, MysqlFundClassificationSettingsRepository],
  exports: [FundClassificationService],
})
export class FundClassificationModule {}
