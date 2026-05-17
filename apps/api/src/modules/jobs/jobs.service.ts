import { Injectable } from '@nestjs/common';

@Injectable()
export class JobsService {
  record(queueName: string, jobName: string): { queueName: string; jobName: string } {
    return { queueName, jobName };
  }
}
