import { Module } from '@nestjs/common';
import { MysqlIntegrationSourceRepository } from '../integrations/repositories/mysql-integration-source.repository';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncPolicy } from './policies/sync.policy';
import { MysqlSyncBatchErrorRepository, MysqlSyncBatchRepository } from './repositories/mysql-sync.repositories';

@Module({
  controllers: [SyncController],
  providers: [
    SyncService,
    SyncPolicy,
    MysqlSyncBatchRepository,
    MysqlSyncBatchErrorRepository,
    MysqlIntegrationSourceRepository,
  ],
  exports: [SyncService],
})
export class SyncModule {}
