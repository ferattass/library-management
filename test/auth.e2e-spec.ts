import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RoleName } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ErrorCode } from '../src/common/exceptions/error-code.enum';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Geliştirme veritabanındaki gerçek kayıtlarla çakışmasın diye
  // teste özel bir e-posta alan adı kullanılıyor.
  const DOMAIN = 'e2e-auth.test';
  const user = {
    email: `ayse@${DOMAIN}`,
    password: 'Guclu123',
    firstName: 'Ayşe',
    lastName: 'Yıldırımoğlu',
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    // main.ts ile aynı kurulum — aksi halde testler üretimde geçerli
    // olmayan bir yapılandırmayı doğrular.
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  const cleanup = async (): Promise<void> => {
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
  };

  const api = () => request(app.getHttpServer());

  describe('POST /api/auth/register', () => {
    it('kullanıcı oluşturur ve USER rolüyle token döner', async () => {
      const res = await api().post('/api/auth/register').send(user).expect(201);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.tokenType).toBe('Bearer');
      expect(res.body.user).toMatchObject({
        email: user.email,
        roles: [RoleName.USER],
      });
    });

    it('Türkçe karakterleri bozmadan saklar', async () => {
      const res = await api()
        .post('/api/auth/register')
        .send({ ...user, email: `utf8@${DOMAIN}` })
        .expect(201);

      expect(res.body.user.firstName).toBe('Ayşe');
      expect(res.body.user.lastName).toBe('Yıldırımoğlu');
    });

    it('yanıtta şifre veya hash sızdırmaz', async () => {
      const res = await api()
        .post('/api/auth/register')
        .send({ ...user, email: `gizli@${DOMAIN}` })
        .expect(201);

      const body = JSON.stringify(res.body);

      expect(body).not.toContain(user.password);
      expect(body).not.toContain('$2b$');
      expect(body).not.toContain('passwordHash');
    });

    it('mükerrer e-postayı büyük/küçük harf farkına rağmen reddeder', async () => {
      const res = await api()
        .post('/api/auth/register')
        .send({ ...user, email: user.email.toUpperCase() })
        .expect(409);

      expect(res.body.code).toBe(ErrorCode.AUTH_EMAIL_TAKEN);
    });

    it('zayıf şifreyi reddeder', async () => {
      const res = await api()
        .post('/api/auth/register')
        .send({ ...user, email: `zayif@${DOMAIN}`, password: 'sadeceharf' })
        .expect(400);

      expect(res.body.code).toBe(ErrorCode.VALIDATION_FAILED);
    });

    it('DTO dışı alan gönderimini reddeder (ayrıcalık yükseltme)', async () => {
      const res = await api()
        .post('/api/auth/register')
        .send({ ...user, email: `enjekte@${DOMAIN}`, isActive: false })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('isActive')]),
      );
    });
  });

  describe('POST /api/auth/login', () => {
    it('doğru bilgilerle token döner', async () => {
      const res = await api()
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it('yanlış şifre ile kayıtsız e-posta aynı yanıtı verir', async () => {
      const wrongPassword = await api()
        .post('/api/auth/login')
        .send({ email: user.email, password: 'YanlisSifre1' })
        .expect(401);

      const noSuchUser = await api()
        .post('/api/auth/login')
        .send({ email: `yok@${DOMAIN}`, password: 'YanlisSifre1' })
        .expect(401);

      // Kod ve mesaj birebir aynı olmalı; fark, saldırgana hangi
      // e-postaların kayıtlı olduğunu söylerdi.
      expect(wrongPassword.body.code).toBe(ErrorCode.AUTH_INVALID_CREDENTIALS);
      expect(noSuchUser.body.code).toBe(wrongPassword.body.code);
      expect(noSuchUser.body.message).toBe(wrongPassword.body.message);
    });

    it('pasifleştirilmiş hesabı reddeder (BR-01.5)', async () => {
      await prisma.user.update({
        where: { email: user.email },
        data: { isActive: false },
      });

      const res = await api()
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(403);

      expect(res.body.code).toBe(ErrorCode.AUTH_ACCOUNT_DISABLED);

      await prisma.user.update({
        where: { email: user.email },
        data: { isActive: true },
      });
    });
  });

  describe('Korunan endpoint’ler', () => {
    let token: string;

    beforeAll(async () => {
      const res = await api()
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password });

      token = res.body.accessToken;
    });

    it('token olmadan 401 döner', async () => {
      const res = await api().get('/api/auth/me').expect(401);

      expect(res.body.code).toBe(ErrorCode.AUTH_TOKEN_INVALID);
    });

    it('kurcalanmış token ile 401 döner', async () => {
      const res = await api()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token.slice(0, -1)}X`)
        .expect(401);

      expect(res.body.code).toBe(ErrorCode.AUTH_TOKEN_INVALID);
    });

    it('geçerli token ile kullanıcıyı döner', async () => {
      const res = await api()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({ email: user.email, roles: [RoleName.USER] });
    });

    it('/api/health kimlik doğrulaması istemez', async () => {
      await api().get('/api/health').expect(200);
    });
  });

  describe('Rol bazlı yetkilendirme', () => {
    it('USER rolü ADMIN endpoint’ine erişemez', async () => {
      const login = await api()
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password });

      const res = await api()
        .get('/api/users')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(403);

      expect(res.body.code).toBe(ErrorCode.AUTH_FORBIDDEN);
    });

    it('token’daki roles claim’i şişirmek yetki vermez', async () => {
      // Roller her istekte veritabanından okunuyor; imzası geçerli bir
      // token'a ADMIN yazmak tek başına yetmez. Burada imzayı bozarak
      // en azından reddedildiğini doğruluyoruz.
      const login = await api()
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password });

      const [header, , signature] = login.body.accessToken.split('.');
      const forged = Buffer.from(
        JSON.stringify({ sub: 1, email: user.email, roles: [RoleName.ADMIN] }),
      ).toString('base64url');

      await api()
        .get('/api/users')
        .set('Authorization', `Bearer ${header}.${forged}.${signature}`)
        .expect(401);
    });
  });
});
