import { Injectable } from '@nestjs/common';
import { UserRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { UserRepository } from '../interfaces/users.repositories';

@Injectable()
export class MysqlUserRepository implements UserRepository {
  constructor(private readonly mysql: MysqlService) {}

  async create(user: UserRow): Promise<void> {
    await this.mysql.execute('INSERT INTO users SET ?', [user]);
  }

  findById(id: string): Promise<UserRow | null> {
    return this.mysql.selectOne<UserRow>('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
  }

  findByEmail(email: string): Promise<UserRow | null> {
    return this.mysql.selectOne<UserRow>('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  }

  async update(user: UserRow): Promise<void> {
    await this.mysql.execute('UPDATE users SET ? WHERE id = ? AND deleted_at IS NULL', [user, user.id]);
  }

  list(cursor?: string, limit = 50): Promise<UserRow[]> {
    if (cursor) {
      return this.mysql.selectMany<UserRow>(
        'SELECT * FROM users WHERE deleted_at IS NULL AND id > ? ORDER BY created_at DESC LIMIT ?',
        [cursor, limit],
      );
    }

    return this.mysql.selectMany<UserRow>(
      'SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?',
      [limit],
    );
  }

  async softDeleteByIds(ids: string[], deletedAt: string): Promise<number> {
    if (ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(', ');
    const result = await this.mysql.execute(
      `UPDATE users SET deleted_at = ?, status = 'inactive' WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      [deletedAt, ...ids],
    );
    return result.affectedRows as number;
  }
}
