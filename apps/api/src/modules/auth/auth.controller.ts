import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { LoginRequestDto } from './dto/requests/login.request.dto';
import { ForgotPasswordRequestDto } from './dto/requests/forgot-password.request.dto';
import { ResetPasswordRequestDto } from './dto/requests/reset-password.request.dto';
import { ConfirmChangePasswordRequestDto } from './dto/requests/confirm-change-password.request.dto';
import { AuthService } from './auth.service';
import { AuthenticatedActor } from '../../common/authenticated-actor';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() payload: LoginRequestDto): Promise<object> {
    return this.authService.login(payload);
  }

  @UseGuards(PermissionGuard)
  @RequirePermissions('auth.login')
  @Post('logout')
  async logout(@CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.authService.logout(actor);
  }

  @UseGuards(PermissionGuard)
  @RequirePermissions('auth.login')
  @Post('refresh')
  async refresh(@CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.authService.refresh(actor);
  }

  @UseGuards(PermissionGuard)
  @RequirePermissions('auth.login')
  @Get('me')
  async me(@CurrentActor() actor: AuthenticatedActor): Promise<AuthenticatedActor> {
    return this.authService.getCurrentActor(actor);
  }

  // ─── Password Management (public — no auth required) ──────────────────────

  @Post('forgot-password')
  async forgotPassword(@Body() payload: ForgotPasswordRequestDto): Promise<object> {
    return this.authService.forgotPassword(payload);
  }

  @Post('reset-password')
  async resetPassword(@Body() payload: ResetPasswordRequestDto): Promise<object> {
    return this.authService.resetPassword(payload);
  }

  @Post('set-password')
  async setPassword(@Body() payload: ResetPasswordRequestDto): Promise<object> {
    return this.authService.setPassword(payload);
  }

  // ─── Change Password (authenticated — OTP flow for non-super-admin) ────────

  @UseGuards(PermissionGuard)
  @RequirePermissions('users.update')
  @Post('change-password/request')
  async requestChangePasswordOtp(@CurrentActor() actor: AuthenticatedActor): Promise<object> {
    return this.authService.requestChangePasswordOtp(actor);
  }

  @UseGuards(PermissionGuard)
  @RequirePermissions('users.update')
  @Post('change-password/confirm')
  async confirmChangePassword(
    @Body() payload: ConfirmChangePasswordRequestDto,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<object> {
    return this.authService.confirmChangePassword(payload, actor);
  }
}
