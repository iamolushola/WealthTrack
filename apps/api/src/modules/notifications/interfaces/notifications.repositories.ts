import { OutboxEventRow } from '@wealthtrack/shared-types';

export interface NotificationOutboxRepository {
  listPendingNotificationEvents(limit: number): Promise<OutboxEventRow[]>;
}
