import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RoleName } from '@prisma/client';
import type { Request } from 'express';

import { ROLES_KEY } from '../decorators/roles.decorator';
import { AppException } from '../exceptions/app.exception';
import type { AuthenticatedUser } from '../types/authenticated-user';

/**
 * @Roles() ile işaretlenmiş endpoint'lerde rol kontrolü yapar.
 * JwtAuthGuard'dan **sonra** çalışmalıdır — request.user'a ihtiyaç duyar.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Rol kısıtı yoksa, kimlik doğrulaması yeterlidir.
    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user?.roles?.some((role) => required.includes(role))) {
      throw AppException.forbidden();
    }

    return true;
  }
}
