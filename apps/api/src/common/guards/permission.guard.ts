import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedActor } from '../authenticated-actor';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      actor?: AuthenticatedActor;
    }>();

    const actorIdHeader = request.headers['x-actor-id'];
    const actorTypeHeader = request.headers['x-actor-type'];
    const permissionsHeader = request.headers['x-permissions'];

    const actorId = Array.isArray(actorIdHeader) ? actorIdHeader[0] : actorIdHeader;
    const actorType = Array.isArray(actorTypeHeader) ? actorTypeHeader[0] : actorTypeHeader;
    const rawPermissions = Array.isArray(permissionsHeader) ? permissionsHeader.join(',') : permissionsHeader;

    if (!actorId || !actorType) {
      throw new UnauthorizedException('Missing actor headers');
    }

    const permissions = (rawPermissions ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    request.actor = {
      actorId,
      actorType: actorType as AuthenticatedActor['actorType'],
      permissions,
    };

    const hasAllPermissions = requiredPermissions.every((permission) => permissions.includes(permission));
    if (!hasAllPermissions) {
      throw new ForbiddenException('Missing required permission');
    }

    return true;
  }
}
