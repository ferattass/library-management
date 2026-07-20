// bcrypt native bir modül; export'ları yeniden tanımlanamadığı için
// jest.spyOn doğrudan çalışmaz. Gerçek implementasyonu koruyan sarmalayıcı
// mock'lar kuruyoruz — davranış aynı kalıyor, çağrılar sayılabiliyor.
jest.mock('bcrypt', () => {
  const actual = jest.requireActual<typeof import('bcrypt')>('bcrypt');

  return {
    ...actual,
    hash: jest.fn(actual.hash),
    compare: jest.fn(actual.compare),
  };
});

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { create: jest.Mock; findUnique: jest.Mock } };
  let jwt: { sign: jest.Mock };

  const ROUNDS = 10; // testlerde 12 yerine 10 — hız için

  const dbUser = {
    id: 1,
    email: 'ayse@ornek.com',
    firstName: 'Ayşe',
    lastName: 'Yılmaz',
    userRoles: [{ role: { name: RoleName.USER } }],
  };

  beforeEach(async () => {
    // Çağrı sayaçlarını sıfırlar, implementasyonu korur.
    jest.clearAllMocks();

    prisma = { user: { create: jest.fn(), findUnique: jest.fn() } };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, fallback: unknown) =>
              key === 'BCRYPT_ROUNDS' ? ROUNDS : (fallback ?? '15m'),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    const dto = {
      email: 'ayse@ornek.com',
      password: 'Guclu123!',
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
    };

    it('şifreyi hash’ler, düz metni saklamaz (BR-01.2)', async () => {
      prisma.user.create.mockResolvedValue(dbUser);

      await service.register(dto);

      const created = prisma.user.create.mock.calls[0][0].data;

      expect(created.passwordHash).not.toBe(dto.password);
      expect(created).not.toHaveProperty('password');
      await expect(bcrypt.compare(dto.password, created.passwordHash)).resolves.toBe(
        true,
      );
    });

    it('yeni kullanıcıya USER rolü atar (BR-01.3)', async () => {
      prisma.user.create.mockResolvedValue(dbUser);

      const result = await service.register(dto);

      const created = prisma.user.create.mock.calls[0][0].data;

      expect(created.userRoles.create.role.connect).toEqual({ name: RoleName.USER });
      expect(result.user.roles).toEqual([RoleName.USER]);
    });

    it('ADMIN rolü atamaz', async () => {
      prisma.user.create.mockResolvedValue(dbUser);

      await service.register(dto);

      const created = prisma.user.create.mock.calls[0][0].data;

      expect(created.userRoles.create.role.connect.name).not.toBe(RoleName.ADMIN);
    });

    it('mükerrer e-postada AUTH_EMAIL_TAKEN döner (BR-01.1)', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: '7.0.0',
        }),
      );

      await expect(service.register(dto)).rejects.toMatchObject({
        code: ErrorCode.AUTH_EMAIL_TAKEN,
      });
    });

    it('beklenmeyen veritabanı hatasını yutmaz', async () => {
      prisma.user.create.mockRejectedValue(new Error('bağlantı koptu'));

      await expect(service.register(dto)).rejects.toThrow('bağlantı koptu');
    });

    it('yanıtta şifre hash’i sızdırmaz', async () => {
      prisma.user.create.mockResolvedValue(dbUser);

      const result = await service.register(dto);

      expect(JSON.stringify(result)).not.toContain('$2b$');
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('login', () => {
    const password = 'Guclu123!';
    const dto = { email: 'ayse@ornek.com', password };

    const activeUser = async () => ({
      ...dbUser,
      isActive: true,
      passwordHash: await bcrypt.hash(password, ROUNDS),
    });

    it('doğru bilgilerle token döner', async () => {
      prisma.user.findUnique.mockResolvedValue(await activeUser());

      const result = await service.login(dto);

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.tokenType).toBe('Bearer');
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 1,
        email: dto.email,
        roles: [RoleName.USER],
      });
    });

    it('yanlış şifrede AUTH_INVALID_CREDENTIALS döner', async () => {
      prisma.user.findUnique.mockResolvedValue(await activeUser());

      await expect(
        service.login({ ...dto, password: 'YanlisSifre1' }),
      ).rejects.toMatchObject({ code: ErrorCode.AUTH_INVALID_CREDENTIALS });
    });

    it('kayıtsız e-postada da aynı hatayı döner (kullanıcı numaralandırma)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toMatchObject({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
      });
    });

    it('kullanıcı yoksa da bcrypt karşılaştırması yapar (zamanlama saldırısı)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toBeInstanceOf(AppException);

      // Erken dönüş olsaydı compare hiç çağrılmaz ve "kayıtsız e-posta"
      // yanıtı "yanlış şifre" yanıtından gözle görülür biçimde hızlı olurdu.
      expect(bcrypt.compare as jest.Mock).toHaveBeenCalledTimes(1);
    });

    it('pasif hesapta AUTH_ACCOUNT_DISABLED döner (BR-01.5)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...(await activeUser()),
        isActive: false,
      });

      await expect(service.login(dto)).rejects.toMatchObject({
        code: ErrorCode.AUTH_ACCOUNT_DISABLED,
      });
    });

    it('pasif hesap kontrolü şifre doğrulamasından sonra yapılır', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...(await activeUser()),
        isActive: false,
      });

      // Yanlış şifre + pasif hesap: hesabın pasif olduğunu sızdırmamalı.
      await expect(
        service.login({ ...dto, password: 'YanlisSifre1' }),
      ).rejects.toMatchObject({ code: ErrorCode.AUTH_INVALID_CREDENTIALS });
    });
  });
});
