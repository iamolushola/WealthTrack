import { Injectable } from '@nestjs/common';
import { OutboxEventRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { OutboxEventRepository } from '../interfaces/outbox.repositories';

@Injectable()
export class MysqlOutboxEventRepository implements OutboxEventRepository {
  constructor(private readonly mysql: MysqlService) {}

  async create(event: OutboxEventRow): Promise<void> {
    await this.mysql.execute('INSERT INTO outbox_events SET ?', [event]);
  }

  findById(id: string): Promise<OutboxEventRow | null> {
    return this.mysql.selectOne<OutboxEventRow>('SELECT * FROM outbox_events WHERE id = ? LIMIT 1', [id]);
  }

  listPending(limit: number): Promise<OutboxEventRow[]> {
    return this.mysql.selectMany<OutboxEventRow>('SELECT * FROM outbox_events WHERE status = ? ORDER BY occurred_at ASC LIMIT ?', [
      'pending',
      limit,
    ]);
  }

  async markDispatched(id: string, dispatchedAtIso: string): Promise<void> {
    await this.mysql.execute('UPDATE outbox_events SET status = ?, dispatched_at = ? WHERE id = ?', ['dispatched', dispatchedAtIso, id]);
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.mysql.execute('UPDATE outbox_events SET status = ?, last_error_message = ? WHERE id = ?', ['failed', errorMessage, id]);
  }
}
