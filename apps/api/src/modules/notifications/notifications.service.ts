import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  queueStatusNotification(eventType: string): { eventType: string } {
    return { eventType };
  }
}
