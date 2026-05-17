import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { MysqlIntegrationSourceRepository } from '../integrations/repositories/mysql-integration-source.repository';
import { MysqlSyncBatchErrorRepository, MysqlSyncBatchRepository } from './repositories/mysql-sync.repositories';
import { SyncPolicy } from './policies/sync.policy';

@Injectable()
export class SyncService {
  constructor(
    private readonly syncPolicy: SyncPolicy,
    private readonly syncBatchRepository: MysqlSyncBatchRepository,
    private readonly syncBatchErrorRepository: MysqlSyncBatchErrorRepository,
    private readonly integrationSourceRepository: MysqlIntegrationSourceRepository,
  ) {}

  async getBatch(id: string, actor: AuthenticatedActor): Promise<object> {
    const batch = await this.syncBatchRepository.findById(id);
    if (!batch) {
      throw new NotFoundException('Sync batch not found');
    }

    const integrationSource = await this.integrationSourceRepository.findById(batch.integrationSourceId);
    if (!integrationSource) {
      throw new NotFoundException('Integration source not found');
    }

    this.syncPolicy.assertCanReadBatch(actor, batch, integrationSource);

    const errors = await this.syncBatchErrorRepository.listBySyncBatchId(id);
    return {
      batch,
      integrationSource,
      errors,
      errorCount: errors.length,
    };
  }
}
