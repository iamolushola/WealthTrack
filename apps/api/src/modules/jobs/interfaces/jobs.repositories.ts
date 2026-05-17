import { JobHistoryRow } from '@wealthtrack/shared-types';

export interface JobHistoryRepository {
  create(job: JobHistoryRow): Promise<void>;
  findByQueueAndJobId(queueName: string, jobId: string): Promise<JobHistoryRow | null>;
  update(job: JobHistoryRow): Promise<void>;
}
