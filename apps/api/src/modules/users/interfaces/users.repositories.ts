import { UserRow } from '@wealthtrack/shared-types';

export interface UserRepository {
  create(user: UserRow): Promise<void>;
  findById(id: string): Promise<UserRow | null>;
  findByEmail(email: string): Promise<UserRow | null>;
  update(user: UserRow): Promise<void>;
  list(cursor?: string, limit?: number): Promise<UserRow[]>;
}
