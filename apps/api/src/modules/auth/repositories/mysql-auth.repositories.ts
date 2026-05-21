import { Injectable } from '@nestjs/common';
import { AuthSessionRow, LoginAttemptRow, PasswordResetTokenRow, PasswordResetTokenPurpose } from '@wealthtrack/shared-types';
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
    await this.mysql.execute(
      'INSERT INTO password_reset_tokens (id, user_id, purpose, token_hash, status, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [token.id, token.userId, token.purpose, token.tokenHash, token.status, token.expiresAt, token.usedAt ?? null, token.createdAt],
    );
  }

  findIssuedToken(id: string): Promise<PasswordResetTokenRow | null> {
    return this.mysql.selectOne<PasswordResetTokenRow>(
      'SELECT * FROM password_reset_tokens WHERE id = ? AND status = ? AND expires_at > UTC_TIMESTAMP(3) LIMIT 1',
      [id, 'issued'],
    );
  }

  findActiveByUserIdAndPurpose(userId: string, purpose: PasswordResetTokenPurpose): Promise<PasswordResetTokenRow | null> {
    return this.mysql.selectOne<PasswordResetTokenRow>(
      'SELECT * FROM password_reset_tokens WHERE user_id = ? AND purpose = ? AND status = ? AND expires_at > UTC_TIMESTAMP(3) ORDER BY created_at DESC LIMIT 1',
      [userId, purpose, 'issued'],
    );
  }

  async revokeAllForUserByPurpose(userId: string, purpose: PasswordResetTokenPurpose, revokedAtIso: string): Promise<void> {
    await this.mysql.execute(
      "UPDATE password_reset_tokens SET status = 'revoked', used_at = ? WHERE user_id = ? AND purpose = ? AND status = 'issued'",
      [revokedAtIso, userId, purpose],
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
