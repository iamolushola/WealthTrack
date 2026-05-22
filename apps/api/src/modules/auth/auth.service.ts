import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { LoginRequestDto } from './dto/requests/login.request.dto';
import { ForgotPasswordRequestDto } from './dto/requests/forgot-password.request.dto';
import { ResetPasswordRequestDto } from './dto/requests/reset-password.request.dto';
import { ConfirmChangePasswordRequestDto } from './dto/requests/confirm-change-password.request.dto';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { MailerService } from '../../common/mailer/mailer.service';
import { forgotPasswordTemplate, welcomeAdminTemplate, changePasswordOtpTemplate } from '../../common/mailer/email-templates';
import { MysqlUserRepository } from '../users/repositories/mysql-user.repository';
import {
  MysqlAuthSessionRepository,
  MysqlLoginAttemptRepository,
  MysqlPasswordResetTokenRepository,
} from './repositories/mysql-auth.repositories';
import { MysqlPermissionRepository, MysqlRolePermissionRepository, MysqlRoleRepository } from '../rbac/repositories/mysql-rbac.repositories';
import { createId, nowIso } from '../../common/utils/ids';
import { hashPassword, verifyPassword } from '../../common/utils/password';

const FORGOT_PASSWORD_EXPIRY_MINUTES = 30;
const SET_PASSWORD_EXPIRY_HOURS = 48;
const CHANGE_PASSWORD_OTP_EXPIRY_MINUTES = 15;
const SUPER_ADMIN_ROLE_CODE = 'super_admin';

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function verifyToken(raw: string, storedHash: string): boolean {
  const computed = Buffer.from(hashToken(raw), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}

function generateOtp(): string {
  const num = randomBytes(3).readUIntBE(0, 3) % 1_000_000;
  return String(num).padStart(6, '0');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersRepository: MysqlUserRepository,
    private readonly authSessionRepository: MysqlAuthSessionRepository,
    private readonly loginAttemptRepository: MysqlLoginAttemptRepository,
    private readonly passwordResetTokenRepository: MysqlPasswordResetTokenRepository,
    private readonly roleRepository: MysqlRoleRepository,
    private readonly rolePermissionRepository: MysqlRolePermissionRepository,
    private readonly permissionRepository: MysqlPermissionRepository,
    private readonly mailerService: MailerService,
  ) {}

  async login(payload: LoginRequestDto): Promise<object> {
    const user = await this.usersRepository.findByEmail(payload.email);
    if (!user || !verifyPassword(payload.password, user.passwordHash)) {
      await this.loginAttemptRepository.append({
        id: createId(),
        email: payload.email,
        userId: user?.id ?? null,
        outcome: 'failed',
        failureReason: 'invalid_credentials',
        ipAddress: null,
        userAgent: null,
        correlationId: null,
        attemptedAt: nowIso(),
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    const role = await this.roleRepository.findById(user.roleId);
    const allPermissions = await this.permissionRepository.list();

    // super_admin implicitly holds every permission so new permissions added in
    // future migrations are automatically available without manual role_permissions
    // entries. All other roles get only their explicitly granted permissions.
    let resolvedPermissions: string[];
    if (role?.code === 'super_admin') {
      resolvedPermissions = allPermissions.map((p) => p.code);
    } else {
      const rolePermissions = await this.rolePermissionRepository.listByRoleId(user.roleId);
      const permMap = new Map(allPermissions.map((p) => [p.id, p.code]));
      resolvedPermissions = rolePermissions
        .map((rp) => permMap.get(rp.permissionId))
        .filter((code): code is string => Boolean(code));
    }

    const sessionId = createId();
    const refreshToken = createId();
    await this.authSessionRepository.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: refreshToken,
      status: 'active',
      ipAddress: null,
      userAgent: null,
      lastSeenAt: nowIso(),
      expiresAt: nowIso(new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)),
      createdAt: nowIso(),
      revokedAt: null,
    });

    await this.loginAttemptRepository.append({
      id: createId(),
      email: payload.email,
      userId: user.id,
      outcome: 'success',
      failureReason: null,
      ipAddress: null,
      userAgent: null,
      correlationId: null,
      attemptedAt: nowIso(),
    });

    await this.usersRepository.update({
      ...user,
      lastLoginAt: nowIso(),
      updatedAt: nowIso(),
    });

    return {
      sessionId,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        roleCode: role?.code ?? user.roleId,
        permissions: resolvedPermissions,
      },
    };
  }

  async logout(actor: AuthenticatedActor): Promise<object> {
    if (actor.sessionId) {
      await this.authSessionRepository.revokeById(actor.sessionId, nowIso());
    }
    return { success: true, actorId: actor.actorId, revokedSessionId: actor.sessionId ?? null };
  }

  async refresh(actor: AuthenticatedActor): Promise<object> {
    const user = await this.usersRepository.findById(actor.actorId);
    if (!user) throw new UnauthorizedException('User not found');

    const role = await this.roleRepository.findById(user.roleId);
    const allPermissions = await this.permissionRepository.list();

    let resolvedPermissions: string[];
    if (role?.code === SUPER_ADMIN_ROLE_CODE) {
      resolvedPermissions = allPermissions.map((p) => p.code);
    } else {
      const rolePermissions = await this.rolePermissionRepository.listByRoleId(user.roleId);
      const permMap = new Map(allPermissions.map((p) => [p.id, p.code]));
      resolvedPermissions = rolePermissions
        .map((rp) => permMap.get(rp.permissionId))
        .filter((code): code is string => Boolean(code));
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleCode: role?.code ?? user.roleId,
        permissions: resolvedPermissions,
      },
    };
  }

  async getCurrentActor(actor: AuthenticatedActor): Promise<AuthenticatedActor> {
    return actor;
  }

  // ─── Forgot Password ───────────────────────────────────────────────────────

  async forgotPassword(payload: ForgotPasswordRequestDto): Promise<object> {
    const user = await this.usersRepository.findByEmail(payload.email);
    const successMsg = { message: 'If that email is registered, a reset link has been sent.' };
    if (!user) return successMsg; // no enumeration

    const now = nowIso();
    const rawToken = randomBytes(32).toString('hex');
    const tokenId = createId();

    await this.passwordResetTokenRepository.revokeAllForUserByPurpose(user.id, 'forgot_password', now);
    await this.passwordResetTokenRepository.create({
      id: tokenId,
      userId: user.id,
      purpose: 'forgot_password',
      tokenHash: hashToken(rawToken),
      status: 'issued',
      expiresAt: nowIso(new Date(Date.now() + FORGOT_PASSWORD_EXPIRY_MINUTES * 60 * 1000)),
      usedAt: null,
      createdAt: now,
    });

    const { subject, html } = forgotPasswordTemplate({
      recipientName: user.name,
      tokenId,
      rawToken,
      expiresInMinutes: FORGOT_PASSWORD_EXPIRY_MINUTES,
    });
    void this.mailerService.sendMail({ to: user.email, subject, html });
    return successMsg;
  }

  // ─── Reset Password (from forgot-password email link) ─────────────────────

  async resetPassword(payload: ResetPasswordRequestDto): Promise<object> {
    const tokenRecord = await this.passwordResetTokenRepository.findIssuedToken(payload.tokenId);
    if (!tokenRecord || tokenRecord.purpose !== 'forgot_password' || !verifyToken(payload.token, tokenRecord.tokenHash)) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const user = await this.usersRepository.findById(tokenRecord.userId);
    if (!user) throw new BadRequestException('Invalid or expired reset link');

    const now = nowIso();
    await this.usersRepository.update({ ...user, passwordHash: hashPassword(payload.newPassword), updatedAt: now, updatedBy: user.id });
    await this.passwordResetTokenRepository.markUsed(tokenRecord.id, now);
    return { message: 'Password has been reset successfully. You can now sign in.' };
  }

  // ─── Set Password (new-admin onboarding link) ─────────────────────────────

  async setPassword(payload: ResetPasswordRequestDto): Promise<object> {
    const tokenRecord = await this.passwordResetTokenRepository.findIssuedToken(payload.tokenId);
    if (!tokenRecord || tokenRecord.purpose !== 'set_password' || !verifyToken(payload.token, tokenRecord.tokenHash)) {
      throw new BadRequestException('Invalid or expired invitation link');
    }

    const user = await this.usersRepository.findById(tokenRecord.userId);
    if (!user) throw new BadRequestException('Invalid or expired invitation link');

    const now = nowIso();
    await this.usersRepository.update({
      ...user,
      passwordHash: hashPassword(payload.newPassword),
      status: 'active',   // activate the account — the user has accepted the invite
      updatedAt: now,
      updatedBy: user.id,
    });
    await this.passwordResetTokenRepository.markUsed(tokenRecord.id, now);
    return { message: 'Password set successfully. You can now sign in.' };
  }

  // ─── Change Password — Request OTP ────────────────────────────────────────

  async requestChangePasswordOtp(actor: AuthenticatedActor): Promise<object> {
    const user = await this.usersRepository.findById(actor.actorId);
    if (!user) throw new UnauthorizedException('User not found');

    const role = await this.roleRepository.findById(user.roleId);
    if (role?.code === SUPER_ADMIN_ROLE_CODE) {
      throw new BadRequestException('Super admin accounts use direct password change — no OTP required');
    }

    const now = nowIso();
    const otp = generateOtp();
    const tokenId = createId();

    await this.passwordResetTokenRepository.revokeAllForUserByPurpose(user.id, 'change_password', now);
    await this.passwordResetTokenRepository.create({
      id: tokenId,
      userId: user.id,
      purpose: 'change_password',
      tokenHash: hashToken(otp),
      status: 'issued',
      expiresAt: nowIso(new Date(Date.now() + CHANGE_PASSWORD_OTP_EXPIRY_MINUTES * 60 * 1000)),
      usedAt: null,
      createdAt: now,
    });

    const { subject, html } = changePasswordOtpTemplate({
      recipientName: user.name,
      otp,
      expiresInMinutes: CHANGE_PASSWORD_OTP_EXPIRY_MINUTES,
    });
    void this.mailerService.sendMail({ to: user.email, subject, html });
    return {
      message: `A verification code has been sent to ${user.email.replace(/^(.{2}).*(@.*)$/, '$1***$2')}`,
      expiresInMinutes: CHANGE_PASSWORD_OTP_EXPIRY_MINUTES,
    };
  }

  // ─── Change Password — Confirm OTP ────────────────────────────────────────

  async confirmChangePassword(payload: ConfirmChangePasswordRequestDto, actor: AuthenticatedActor): Promise<object> {
    const user = await this.usersRepository.findById(actor.actorId);
    if (!user) throw new UnauthorizedException('User not found');

    const tokenRecord = await this.passwordResetTokenRepository.findActiveByUserIdAndPurpose(user.id, 'change_password');
    if (!tokenRecord) throw new BadRequestException('No active verification code — please request a new one');
    if (!verifyToken(payload.otp, tokenRecord.tokenHash)) throw new BadRequestException('Invalid or expired verification code');

    const now = nowIso();
    await this.usersRepository.update({ ...user, passwordHash: hashPassword(payload.newPassword), updatedAt: now, updatedBy: user.id });
    await this.passwordResetTokenRepository.markUsed(tokenRecord.id, now);
    return { message: 'Password changed successfully.' };
  }

  // ─── Welcome token helper (called by UsersService) ────────────────────────

  async issueWelcomeToken(userId: string, now: string): Promise<{ tokenId: string; rawToken: string }> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenId = createId();

    await this.passwordResetTokenRepository.revokeAllForUserByPurpose(userId, 'set_password', now);
    await this.passwordResetTokenRepository.create({
      id: tokenId,
      userId,
      purpose: 'set_password',
      tokenHash: hashToken(rawToken),
      status: 'issued',
      expiresAt: nowIso(new Date(Date.now() + SET_PASSWORD_EXPIRY_HOURS * 60 * 60 * 1000)),
      usedAt: null,
      createdAt: now,
    });
    return { tokenId, rawToken };
  }

  get welcomeTemplate() {
    return welcomeAdminTemplate;
  }

  get setPasswordExpiryHours() {
    return SET_PASSWORD_EXPIRY_HOURS;
  }
}
