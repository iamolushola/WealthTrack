import { Injectable, Logger } from '@nestjs/common';
import { NOTIFICATION_QUEUE, NotificationJob } from '../queues/notification.queue';
import { QueueProcessor } from './processor.interface';

@Injectable()
export class NotificationProcessor implements QueueProcessor<NotificationJob> {
  readonly queueName = NOTIFICATION_QUEUE;
  private readonly logger = new Logger(NotificationProcessor.name);

  async handle(jobName: string, data: NotificationJob): Promise<{ status: string; eventId: string }> {
    this.logger.log(`Processed ${jobName} for notification event ${data.eventId}`);
    return { status: 'sent', eventId: data.eventId };
  }
}
