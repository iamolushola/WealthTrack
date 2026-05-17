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
    return this.mysql.selectOne<UserRow>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  }

  findByEmail(email: string): Promise<UserRow | null> {
    return this.mysql.selectOne<UserRow>('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  }

  async update(user: UserRow): Promise<void> {
    await this.mysql.execute('UPDATE users SET ? WHERE id = ?', [user, user.id]);
  }

  list(cursor?: string, limit = 50): Promise<UserRow[]> {
    if (cursor) {
      return this.mysql.selectMany<UserRow>('SELECT * FROM users WHERE id > ? ORDER BY id ASC LIMIT ?', [cursor, limit]);
    }

    return this.mysql.selectMany<UserRow>('SELECT * FROM users ORDER BY id ASC LIMIT ?', [limit]);
  }
}
