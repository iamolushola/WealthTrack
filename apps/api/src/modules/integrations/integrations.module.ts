import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { IntegrationsPolicy } from './policies/integrations.policy';
import { MysqlIntegrationSourceRepository } from './repositories/mysql-integration-source.repository';
import { MysqlSyncBatchRepository } from '../sync/repositories/mysql-sync.repositories';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [OutboxModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, IntegrationsPolicy, MysqlIntegrationSourceRepository, MysqlSyncBatchRepository],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
