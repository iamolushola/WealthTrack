import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedActor } from '../authenticated-actor';

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedActor | undefined => {
    const request = context.switchToHttp().getRequest<{ actor?: AuthenticatedActor }>();
    return request.actor;
  },
);
