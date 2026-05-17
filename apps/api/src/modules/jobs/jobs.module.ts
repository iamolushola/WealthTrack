import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { MysqlJobHistoryRepository } from './repositories/mysql-job-history.repository';

@Module({
  providers: [JobsService, MysqlJobHistoryRepository],
  exports: [JobsService],
})
export class JobsModule {}
