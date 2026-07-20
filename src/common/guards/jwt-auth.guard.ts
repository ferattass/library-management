import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppException } from '../exceptions/app.exception';

/**
 * Global olarak kayıtlıdır (bkz. app.module.ts) — @Public() ile işaretlenmemiş
 * her endpoint geçerli bir Bearer token ister.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return isPublic ? true : super.canActivate(context);
  }

  /**
   * Passport'un varsayılan "Unauthorized" mesajı yerine standart hata
   * gövdemizi döndürür.
   */
  handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw err instanceof AppException ? err : AppException.tokenInvalid();
    }

    return user;
  }
}
