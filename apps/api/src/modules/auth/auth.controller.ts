import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { LoginRequestDto } from './dto/requests/login.request.dto';
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
}
