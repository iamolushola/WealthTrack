import { OutboxEventRow } from '@wealthtrack/shared-types';

export interface OutboxEventRepository {
  create(event: OutboxEventRow): Promise<void>;
  findById(id: string): Promise<OutboxEventRow | null>;
  listPending(limit: number): Promise<OutboxEventRow[]>;
  markDispatched(id: string, dispatchedAtIso: string): Promise<void>;
  markFailed(id: string, errorMessage: string): Promise<void>;
}
