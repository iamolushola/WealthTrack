import { Injectable } from '@nestjs/common';
import { AuthSessionRow, LoginAttemptRow, PasswordResetTokenRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import {
  AuthSessionRepository,
  LoginAttemptRepository,
  PasswordResetTokenRepository,
} from '../interfaces/auth.repositories';

@Injectable()
export class MysqlAuthSessionRepository implements AuthSessionRepository {
  constructor(private readonly mysql: MysqlService) {}

  async create(session: AuthSessionRow): Promise<void> {
    await this.mysql.execute('INSERT INTO auth_sessions SET ?', [session]);
  }

  findActiveById(id: string): Promise<AuthSessionRow | null> {
    return this.mysql.selectOne<AuthSessionRow>(
      'SELECT * FROM auth_sessions WHERE id = ? AND status = ? LIMIT 1',
      [id, 'active'],
    );
  }

  async revokeById(id: string, revokedAtIso: string): Promise<void> {
    await this.mysql.execute('UPDATE auth_sessions SET status = ?, revoked_at = ? WHERE id = ?', ['revoked', revokedAtIso, id]);
  }
}

@Injectable()
export class MysqlPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly mysql: MysqlService) {}

  async create(token: PasswordResetTokenRow): Promise<void> {
    await this.mysql.execute('INSERT INTO password_reset_tokens SET ?', [token]);
  }

  findIssuedToken(id: string): Promise<PasswordResetTokenRow | null> {
    return this.mysql.selectOne<PasswordResetTokenRow>(
      'SELECT * FROM password_reset_tokens WHERE id = ? AND status = ? LIMIT 1',
      [id, 'issued'],
    );
  }

  async markUsed(id: string, usedAtIso: string): Promise<void> {
    await this.mysql.execute('UPDATE password_reset_tokens SET status = ?, used_at = ? WHERE id = ?', ['used', usedAtIso, id]);
  }
}

@Injectable()
export class MysqlLoginAttemptRepository implements LoginAttemptRepository {
  constructor(private readonly mysql: MysqlService) {}

  async append(attempt: LoginAttemptRow): Promise<void> {
    await this.mysql.execute('INSERT INTO login_attempts SET ?', [attempt]);
  }

  listRecentByEmail(email: string, limit: number): Promise<LoginAttemptRow[]> {
    return this.mysql.selectMany<LoginAttemptRow>(
      'SELECT * FROM login_attempts WHERE email = ? ORDER BY attempted_at DESC LIMIT ?',
      [email, limit],
    );
  }
}
