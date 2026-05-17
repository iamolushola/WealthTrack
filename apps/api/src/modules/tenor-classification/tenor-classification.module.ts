import { Module } from '@nestjs/common';
import { TenorClassificationService } from './tenor-classification.service';
import { MysqlTenorBandRepository } from './repositories/mysql-tenor-band.repository';

@Module({
  providers: [TenorClassificationService, MysqlTenorBandRepository],
  exports: [TenorClassificationService],
})
export class TenorClassificationModule {}
