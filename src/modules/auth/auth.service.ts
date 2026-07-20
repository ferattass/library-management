import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { AppException } from '../../common/exceptions/app.exception';
import type { JwtPayload } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * Kullanıcı bulunamadığında da bcrypt.compare çalıştırmak için kullanılır.
 * Aksi halde "e-posta kayıtlı değil" yanıtı, "şifre yanlış" yanıtından
 * belirgin biçimde daha hızlı döner ve saldırgan bu zaman farkından
 * hangi e-postaların kayıtlı olduğunu çıkarabilir.
 */
const DUMMY_HASH = '$2b$12$Ku7uPh4n3Y0n3t1mS1st3m1Du33mmyHashPlaceholder.Xyz9aBc';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  userRoles: { select: { role: { select: { name: true } } } },
} satisfies Prisma.UserSelect;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly bcryptRounds: number;
  private readonly expiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.bcryptRounds = config.get<number>('BCRYPT_ROUNDS', 12);
    this.expiresIn = config.get<string>('JWT_EXPIRES_IN', '15m');
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);

    try {
      // Kullanıcı ve rol ataması iç içe yazımla oluşturulur; Prisma bunu
      // tek transaction olarak çalıştırır — rolsüz kullanıcı oluşamaz.
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          userRoles: {
            create: { role: { connect: { name: RoleName.USER } } },
          },
        },
        select: USER_SELECT,
      });

      this.logger.log(`Yeni kayıt: userId=${user.id}`);

      return this.buildResponse(user);
    } catch (error) {
      // Ön kontrol yerine kısıt ihlalini yakalıyoruz: "önce sorgula sonra
      // yaz" iki eşzamanlı kayıt arasında yarış durumu bırakır, UNIQUE
      // kısıtı bırakmaz.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw AppException.emailTaken();
      }

      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { ...USER_SELECT, passwordHash: true, isActive: true },
    });

    const matches = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_HASH,
    );

    if (!user || !matches) {
      this.logger.warn(`Başarısız giriş denemesi: ${dto.email}`);
      throw AppException.invalidCredentials();
    }

    if (!user.isActive) {
      throw AppException.accountDisabled();
    }

    this.logger.log(`Giriş: userId=${user.id}`);

    return this.buildResponse(user);
  }

  private buildResponse(user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    userRoles: { role: { name: RoleName } }[];
  }): AuthResponseDto {
    const roles = user.userRoles.map((ur) => ur.role.name);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles,
    };

    return {
      accessToken: this.jwt.sign(payload),
      tokenType: 'Bearer',
      expiresIn: this.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
      },
    };
  }
}
