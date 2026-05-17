import { IntegrationSourceRow } from '@wealthtrack/shared-types';

export interface IntegrationSourceRepository {
  create(source: IntegrationSourceRow): Promise<void>;
  findById(id: string): Promise<IntegrationSourceRow | null>;
  list(): Promise<IntegrationSourceRow[]>;
  update(source: IntegrationSourceRow): Promise<void>;
}
