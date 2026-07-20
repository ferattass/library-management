import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BorrowingStatus, ReservationStatus } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { MAX_ACTIVE_BORROWINGS } from '../src/common/constants/library.constants';
import { ErrorCode } from '../src/common/exceptions/error-code.enum';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Borrowings (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const DOMAIN = 'e2e-borrow.test';
  const PREFIX = 'E2E_BORROW_';

  let publisherId: number;
  let authorId: number;
  let categoryId: number;

  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
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

    const publisher = await prisma.publisher.create({
      data: { name: `${PREFIX}Yayınevi` },
    });
    const author = await prisma.author.create({
      data: { firstName: `${PREFIX}Ad`, lastName: 'Soyad' },
    });
    const category = await prisma.category.create({
      data: { name: `${PREFIX}Kategori`, slug: `${PREFIX.toLowerCase()}kategori` },
    });

    publisherId = publisher.id;
    authorId = author.id;
    categoryId = category.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup(): Promise<void> {
    const books = await prisma.book.findMany({
      where: { title: { startsWith: PREFIX } },
      select: { id: true },
    });
    const bookIds = books.map((b) => b.id);

    await prisma.reservation.deleteMany({ where: { bookId: { in: bookIds } } });
    await prisma.borrowing.deleteMany({ where: { bookId: { in: bookIds } } });
    await prisma.bookAuthor.deleteMany({ where: { bookId: { in: bookIds } } });
    await prisma.bookCategory.deleteMany({ where: { bookId: { in: bookIds } } });
    await prisma.book.deleteMany({ where: { id: { in: bookIds } } });

    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await prisma.author.deleteMany({ where: { firstName: { startsWith: PREFIX } } });
    await prisma.category.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.publisher.deleteMany({ where: { name: { startsWith: PREFIX } } });
  }

  /** Kayıt olup token döndürür. */
  async function newUser(local: string): Promise<string> {
    const res = await api()
      .post('/api/auth/register')
      .send({
        email: `${local}@${DOMAIN}`,
        password: 'Guclu123',
        firstName: 'Test',
        lastName: 'Kullanıcı',
      })
      .expect(201);

    return res.body.accessToken;
  }

  async function newBook(title: string, copies: number): Promise<number> {
    const book = await prisma.book.create({
      data: {
        title: `${PREFIX}${title}`,
        publisherId,
        totalCopies: copies,
        availableCopies: copies,
        bookAuthors: { create: { authorId } },
        bookCategories: { create: { categoryId } },
      },
    });

    return book.id;
  }

  const borrow = (token: string, bookId: number) =>
    api()
      .post('/api/borrowings')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId });

  describe('POST /api/borrowings', () => {
    it('token olmadan reddedilir', async () => {
      const bookId = await newBook('Anon', 1);

      await api().post('/api/borrowings').send({ bookId }).expect(401);
    });

    it('ödünç verir, stoğu düşürür ve 14 günlük vade koyar', async () => {
      const token = await newUser('basic');
      const bookId = await newBook('Basic', 3);

      const res = await borrow(token, bookId).expect(201);

      expect(res.body.status).toBe(BorrowingStatus.BORROWED);
      expect(res.body.book.availableCopies).toBe(2);

      const days = Math.round(
        (new Date(res.body.dueDate).getTime() -
          new Date(res.body.borrowedAt).getTime()) /
          86_400_000,
      );

      expect(days).toBe(14);
    });

    it('stok bittiğinde BOOK_OUT_OF_STOCK döner', async () => {
      const first = await newUser('stok1');
      const second = await newUser('stok2');
      const bookId = await newBook('TekKopya', 1);

      await borrow(first, bookId).expect(201);

      const res = await borrow(second, bookId).expect(409);

      expect(res.body.code).toBe(ErrorCode.BOOK_OUT_OF_STOCK);
    });

    it('elindeki kitabı tekrar almayı reddeder', async () => {
      const token = await newUser('tekrar');
      const bookId = await newBook('Tekrar', 5);

      await borrow(token, bookId).expect(201);

      const res = await borrow(token, bookId).expect(409);

      expect(res.body.code).toBe(ErrorCode.BORROW_ALREADY_ACTIVE);
    });

    it(`en fazla ${MAX_ACTIVE_BORROWINGS} aktif ödünce izin verir`, async () => {
      const token = await newUser('limit');

      for (let i = 0; i < MAX_ACTIVE_BORROWINGS; i++) {
        const bookId = await newBook(`Limit${i}`, 1);
        await borrow(token, bookId).expect(201);
      }

      const extra = await newBook('LimitAsim', 1);
      const res = await borrow(token, extra).expect(409);

      expect(res.body.code).toBe(ErrorCode.BORROW_LIMIT_EXCEEDED);
    });

    it('olmayan kitap için 404 döner', async () => {
      const token = await newUser('yok');

      await borrow(token, 2_000_000_000).expect(404);
    });
  });

  describe('eşzamanlılık', () => {
    it('tek kopyaya eşzamanlı 15 istekte yalnızca biri başarılı olur', async () => {
      const bookId = await newBook('Yaris', 1);
      const tokens = await Promise.all(
        Array.from({ length: 15 }, (_, i) => newUser(`yaris${i}`)),
      );

      const results = await Promise.all(
        tokens.map((t) => borrow(t, bookId).then((r) => r.status)),
      );

      const created = results.filter((s) => s === 201).length;
      const conflicts = results.filter((s) => s === 409).length;

      expect(created).toBe(1);
      expect(conflicts).toBe(14);

      const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
      const records = await prisma.borrowing.count({ where: { bookId } });

      // Asıl güvence: stok negatife düşmemeli ve fazla kayıt oluşmamalı.
      expect(book.availableCopies).toBe(0);
      expect(records).toBe(1);
    });
  });

  describe('PATCH /api/borrowings/:id/return', () => {
    it('iade eder ve stoğu geri artırır', async () => {
      const token = await newUser('iade');
      const bookId = await newBook('Iade', 2);

      const created = await borrow(token, bookId).expect(201);

      const res = await api()
        .patch(`/api/borrowings/${created.body.id}/return`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.status).toBe(BorrowingStatus.RETURNED);
      expect(res.body.returnedAt).not.toBeNull();
      // Yanıttaki stok, iade sonrası gerçek değeri göstermeli.
      expect(res.body.book.availableCopies).toBe(2);

      const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });

      expect(book.availableCopies).toBe(2);
    });

    it('ikinci iadeyi reddeder', async () => {
      const token = await newUser('cifteiade');
      const bookId = await newBook('CifteIade', 1);

      const created = await borrow(token, bookId).expect(201);
      const url = `/api/borrowings/${created.body.id}/return`;

      await api().patch(url).set('Authorization', `Bearer ${token}`).expect(200);

      const res = await api()
        .patch(url)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(res.body.code).toBe(ErrorCode.BORROW_ALREADY_RETURNED);
    });

    it('başkasının kaydını iade ettirmez', async () => {
      const owner = await newUser('sahip');
      const other = await newUser('yabanci');
      const bookId = await newBook('Sahiplik', 2);

      const created = await borrow(owner, bookId).expect(201);

      const res = await api()
        .patch(`/api/borrowings/${created.body.id}/return`)
        .set('Authorization', `Bearer ${other}`)
        .expect(403);

      expect(res.body.code).toBe(ErrorCode.AUTH_FORBIDDEN);
    });

    it('iade kuyruktaki ilk rezervasyonu READY yapar', async () => {
      const holder = await newUser('tutan');
      const waiter = await newUser('bekleyen');
      const bookId = await newBook('Kuyruk', 1);

      const created = await borrow(holder, bookId).expect(201);

      const reservation = await api()
        .post('/api/reservations')
        .set('Authorization', `Bearer ${waiter}`)
        .send({ bookId })
        .expect(201);

      expect(reservation.body.status).toBe(ReservationStatus.PENDING);
      expect(reservation.body.queuePosition).toBe(1);

      await api()
        .patch(`/api/borrowings/${created.body.id}/return`)
        .set('Authorization', `Bearer ${holder}`)
        .expect(200);

      const after = await prisma.reservation.findUniqueOrThrow({
        where: { id: reservation.body.id },
      });

      expect(after.status).toBe(ReservationStatus.READY);
      // CHECK kısıtı READY için readyUntil zorunlu kılıyor.
      expect(after.readyUntil).not.toBeNull();
    });
  });

  describe('GET /api/borrowings', () => {
    it('kullanıcı yalnızca kendi kayıtlarını görür', async () => {
      const mine = await newUser('benim');
      const theirs = await newUser('onun');

      await borrow(mine, await newBook('Benim', 1)).expect(201);
      await borrow(theirs, await newBook('Onun', 1)).expect(201);

      const res = await api()
        .get('/api/borrowings')
        .set('Authorization', `Bearer ${mine}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((b: any) => b.user.email === `benim@${DOMAIN}`)).toBe(
        true,
      );
    });

    it('userId filtresiyle başkasının kaydına erişilemez', async () => {
      const attacker = await newUser('saldirgan');
      const victim = await prisma.user.findFirstOrThrow({
        where: { email: `benim@${DOMAIN}` },
      });

      const res = await api()
        .get(`/api/borrowings?userId=${victim.id}`)
        .set('Authorization', `Bearer ${attacker}`)
        .expect(200);

      // Filtre yok sayılmalı; saldırgan kendi (boş) listesini görmeli.
      expect(res.body.data.every((b: any) => b.user.id !== victim.id)).toBe(true);
    });
  });
});
