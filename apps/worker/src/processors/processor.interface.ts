export interface QueueProcessor<TJobData, TResult = unknown> {
  readonly queueName: string;
  handle(jobName: string, data: TJobData): Promise<TResult>;
}
