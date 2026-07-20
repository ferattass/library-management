import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AppException } from '../../../common/exceptions/app.exception';
import type {
  AuthenticatedUser,
  JwtPayload,
} from '../../../common/types/authenticated-user';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * İmza doğrulandıktan sonra çalışır ve dönen değer request.user olur.
   *
   * Rolleri token'dan okumak yerine her istekte veritabanından teyit ediyoruz.
   * Maliyeti istek başına bir sorgu; karşılığında pasifleştirilen veya rolü
   * geri alınan kullanıcı token'ının süresi dolmadan da etkisiz kalıyor
   * (BR-01.5). Token ömrü 15 dakika olduğundan alternatif, iptal edilmiş bir
   * yetkinin 15 dakika boyunca geçerli kalması olurdu.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isActive: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });

    if (!user) {
      throw AppException.tokenInvalid();
    }

    if (!user.isActive) {
      throw AppException.accountDisabled();
    }

    return {
      id: user.id,
      email: user.email,
      roles: user.userRoles.map((ur) => ur.role.name),
    };
  }
}
