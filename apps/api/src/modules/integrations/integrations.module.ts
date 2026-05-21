import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { GoogleSheetsWebhookController } from './google-sheets-webhook.controller';
import { IntegrationsService } from './integrations.service';
import { IntegrationsPolicy } from './policies/integrations.policy';
import { MysqlIntegrationSourceRepository } from './repositories/mysql-integration-source.repository';
import { MysqlGoogleSheetTabRepository } from './repositories/mysql-google-sheet-tab.repository';
import { MysqlSyncBatchRepository } from '../sync/repositories/mysql-sync.repositories';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [OutboxModule],
  controllers: [IntegrationsController, GoogleSheetsWebhookController],
  providers: [
    IntegrationsService,
    IntegrationsPolicy,
    MysqlIntegrationSourceRepository,
    MysqlGoogleSheetTabRepository,
    MysqlSyncBatchRepository,
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
