import { Injectable } from '@nestjs/common';
import { OutboxEventRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { NotificationOutboxRepository } from '../interfaces/notifications.repositories';

@Injectable()
export class MysqlNotificationOutboxRepository implements NotificationOutboxRepository {
  constructor(private readonly mysql: MysqlService) {}

  listPendingNotificationEvents(limit: number): Promise<OutboxEventRow[]> {
    return this.mysql.selectMany<OutboxEventRow>(
      'SELECT * FROM outbox_events WHERE status = ? AND event_type LIKE ? ORDER BY occurred_at ASC LIMIT ?',
      ['pending', '%.%', limit],
    );
  }
}
