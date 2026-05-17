export interface RepositoryFindOptions {
  requestId?: string;
  correlationId?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
}

export * from './database';
export * from './queues';

