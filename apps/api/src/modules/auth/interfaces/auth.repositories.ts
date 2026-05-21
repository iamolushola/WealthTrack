import { AuthSessionRow, LoginAttemptRow, PasswordResetTokenRow, PasswordResetTokenPurpose } from '@wealthtrack/shared-types';

export interface AuthSessionRepository {
  create(session: AuthSessionRow): Promise<void>;
  findActiveById(id: string): Promise<AuthSessionRow | null>;
  revokeById(id: string, revokedAtIso: string): Promise<void>;
}

export interface PasswordResetTokenRepository {
  create(token: PasswordResetTokenRow): Promise<void>;
  findIssuedToken(id: string): Promise<PasswordResetTokenRow | null>;
  findActiveByUserIdAndPurpose(userId: string, purpose: PasswordResetTokenPurpose): Promise<PasswordResetTokenRow | null>;
  revokeAllForUserByPurpose(userId: string, purpose: PasswordResetTokenPurpose, revokedAtIso: string): Promise<void>;
  markUsed(id: string, usedAtIso: string): Promise<void>;
}

export interface LoginAttemptRepository {
  append(attempt: LoginAttemptRow): Promise<void>;
  listRecentByEmail(email: string, limit: number): Promise<LoginAttemptRow[]>;
}
