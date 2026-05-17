import { AuthSessionRow, LoginAttemptRow, PasswordResetTokenRow } from '@wealthtrack/shared-types';

export interface AuthSessionRepository {
  create(session: AuthSessionRow): Promise<void>;
  findActiveById(id: string): Promise<AuthSessionRow | null>;
  revokeById(id: string, revokedAtIso: string): Promise<void>;
}

export interface PasswordResetTokenRepository {
  create(token: PasswordResetTokenRow): Promise<void>;
  findIssuedToken(id: string): Promise<PasswordResetTokenRow | null>;
  markUsed(id: string, usedAtIso: string): Promise<void>;
}

export interface LoginAttemptRepository {
  append(attempt: LoginAttemptRow): Promise<void>;
  listRecentByEmail(email: string, limit: number): Promise<LoginAttemptRow[]>;
}
