import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../types/authenticated-user';

/**
 * Doğrulanmış kullanıcıyı controller parametresine enjekte eder.
 *
 * @example findMine(@CurrentUser() user: AuthenticatedUser)
 * @example findMine(@CurrentUser('id') userId: number)
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser;

    return field ? user?.[field] : user;
  },
);
