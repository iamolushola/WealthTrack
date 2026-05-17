import { Injectable } from '@nestjs/common';
import { IntegrationSourceRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { IntegrationSourceRepository } from '../interfaces/integrations.repositories';

@Injectable()
export class MysqlIntegrationSourceRepository implements IntegrationSourceRepository {
  constructor(private readonly mysql: MysqlService) {}

  async create(source: IntegrationSourceRow): Promise<void> {
    await this.mysql.execute('INSERT INTO integration_sources SET ?', [source]);
  }

  findById(id: string): Promise<IntegrationSourceRow | null> {
    return this.mysql.selectOne<IntegrationSourceRow>('SELECT * FROM integration_sources WHERE id = ? LIMIT 1', [id]);
  }

  list(): Promise<IntegrationSourceRow[]> {
    return this.mysql.selectMany<IntegrationSourceRow>('SELECT * FROM integration_sources ORDER BY created_at DESC');
  }

  async update(source: IntegrationSourceRow): Promise<void> {
    await this.mysql.execute('UPDATE integration_sources SET ? WHERE id = ?', [source, source.id]);
  }
}
