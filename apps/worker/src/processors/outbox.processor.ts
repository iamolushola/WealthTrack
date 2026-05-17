import { Injectable, Logger } from '@nestjs/common';
import { DispatchOutboxEventJob, OUTBOX_QUEUE } from '../queues/outbox.queue';
import { MysqlWorkerService } from '../persistence/mysql.service';
import { nowIso } from '../common/utils/ids';
import { QueueProcessor } from './processor.interface';

@Injectable()
export class OutboxProcessor implements QueueProcessor<DispatchOutboxEventJob> {
  readonly queueName = OUTBOX_QUEUE;
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(private readonly mysql: MysqlWorkerService) {}

  async handle(jobName: string, data: DispatchOutboxEventJob): Promise<{ status: string; outboxEventId: string }> {
    const event = await this.mysql.selectOne<{ id: string; status: string }>('SELECT id, status FROM outbox_events WHERE id = ? LIMIT 1', [
      data.outboxEventId,
    ]);
    if (!event) {
      throw new Error(`Outbox event ${data.outboxEventId} not found`);
    }

    await this.mysql.execute('UPDATE outbox_events SET status = ?, dispatched_at = ?, updated_at = ? WHERE id = ?', [
      'dispatched',
      nowIso(),
      nowIso(),
      data.outboxEventId,
    ]);
    this.logger.log(`Processed ${jobName} for outbox event ${data.outboxEventId}`);
    return { status: 'dispatched', outboxEventId: data.outboxEventId };
  }
}
