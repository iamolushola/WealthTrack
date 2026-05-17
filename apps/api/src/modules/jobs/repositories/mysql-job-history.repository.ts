import { Injectable } from '@nestjs/common';
import { JobHistoryRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { JobHistoryRepository } from '../interfaces/jobs.repositories';

@Injectable()
export class MysqlJobHistoryRepository implements JobHistoryRepository {
  constructor(private readonly mysql: MysqlService) {}

  async create(job: JobHistoryRow): Promise<void> {
    await this.mysql.execute('INSERT INTO job_history SET ?', [job]);
  }

  findByQueueAndJobId(queueName: string, jobId: string): Promise<JobHistoryRow | null> {
    return this.mysql.selectOne<JobHistoryRow>('SELECT * FROM job_history WHERE queue_name = ? AND job_id = ? LIMIT 1', [queueName, jobId]);
  }

  async update(job: JobHistoryRow): Promise<void> {
    await this.mysql.execute('UPDATE job_history SET ? WHERE id = ?', [job, job.id]);
  }
}
