import { Injectable } from '@nestjs/common';
import { DispatchOutboxEventJob, OutboxEventRow } from '@wealthtrack/shared-types';
import { createId, nowIso } from '../../common/utils/ids';
import { JobDispatcherService } from '../../common/queues/job-dispatcher.service';
import { MysqlOutboxEventRepository } from './repositories/mysql-outbox-event.repository';

@Injectable()
export class OutboxService {
  constructor(
    private readonly outboxEventRepository: MysqlOutboxEventRepository,
    private readonly jobDispatcherService: JobDispatcherService,
  ) {}

  async queue(
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    payloadJson: Record<string, unknown>,
    correlationId = createId(),
  ): Promise<OutboxEventRow> {
    const event: OutboxEventRow = {
      id: createId(),
      aggregateType,
      aggregateId,
      eventType,
      eventVersion: 1,
      payloadJson,
      headersJson: null,
      correlationId,
      requestId: null,
      occurredAt: nowIso(),
      status: 'pending',
      attempts: 0,
      nextAttemptAt: null,
      dispatchedAt: null,
      lastErrorMessage: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    await this.outboxEventRepository.create(event);
    const job: DispatchOutboxEventJob = {
      outboxEventId: event.id,
      correlationId,
    };
    await this.jobDispatcherService.enqueueOutbox(job);
    return event;
  }
}
