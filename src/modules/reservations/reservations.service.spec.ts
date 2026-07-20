import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, ReservationStatus, RoleName } from '@prisma/client';

import { ErrorCode } from '../../common/exceptions/error-code.enum';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let prisma: any;

  const USER: AuthenticatedUser = { id: 10, email: 'u@x.com', roles: [RoleName.USER] };
  const ADMIN: AuthenticatedUser = { id: 99, email: 'a@x.com', roles: [RoleName.ADMIN] };

  const row = {
    id: 1,
    status: ReservationStatus.PENDING,
    queuePosition: 1,
    reservedAt: new Date(),
    readyUntil: null,
    user: { id: 10, email: 'u@x.com', firstName: 'A', lastName: 'B' },
    book: { id: 5, title: 'Huzur', isbn: null, availableCopies: 0 },
  };

  beforeEach(async () => {
    prisma = {
      book: { findUnique: jest.fn().mockResolvedValue({ id: 5 }) },
      borrowing: { count: jest.fn().mockResolvedValue(0) },
      reservation: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue(row),
        update: jest.fn().mockResolvedValue(row),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 5 }]),
      $transaction: jest.fn((arg: unknown) =>
        typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : [0, []],
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReservationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ReservationsService);
  });

  describe('kuyruk sırası (BR-04.2)', () => {
    it('ilk rezervasyona 1 numarasını verir', async () => {
      await service.create(10, { bookId: 5 });

      expect(prisma.reservation.create.mock.calls[0][0].data.queuePosition).toBe(1);
    });

    it('sıra numarasını mevcut son numaranın bir fazlası yapar', async () => {
      prisma.reservation.findFirst.mockResolvedValue({ queuePosition: 4 });

      await service.create(10, { bookId: 5 });

      expect(prisma.reservation.create.mock.calls[0][0].data.queuePosition).toBe(5);
    });

    it('sıra numarasını hesaplamadan önce kitap satırını kilitler', async () => {
      await service.create(10, { bookId: 5 });

      // Kilit olmasaydı eşzamanlı iki rezervasyon aynı numarayı
      // hesaplayıp kuyruk sırasını bozardı.
      const lockOrder = prisma.$queryRaw.mock.invocationCallOrder[0];
      const readOrder = prisma.reservation.findFirst.mock.invocationCallOrder[0];

      expect(lockOrder).toBeLessThan(readOrder);
    });

    it('sıra hesabında yalnızca aktif rezervasyonları sayar', async () => {
      await service.create(10, { bookId: 5 });

      // İptal edilmişler sayılsaydı kuyrukta boşluk büyür ve sıra
      // numaraları gerçek bekleyen sayısını yansıtmazdı.
      expect(prisma.reservation.findFirst.mock.calls[0][0].where.status.in).toEqual([
        ReservationStatus.PENDING,
        ReservationStatus.READY,
      ]);
    });
  });

  describe('iş kuralları', () => {
    it('aktif rezervasyon varken ikincisini reddeder (BR-04.1)', async () => {
      prisma.reservation.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: '7.0.0',
        }),
      );

      await expect(service.create(10, { bookId: 5 })).rejects.toMatchObject({
        code: ErrorCode.RESERVATION_DUPLICATE,
      });
    });

    it('kitap elindeyken rezervasyonu reddeder (BR-04.3)', async () => {
      prisma.borrowing.count.mockResolvedValue(1);

      await expect(service.create(10, { bookId: 5 })).rejects.toMatchObject({
        code: ErrorCode.RESERVATION_BOOK_IN_HAND,
      });

      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });

    it('olmayan kitabı reddeder', async () => {
      prisma.book.findUnique.mockResolvedValue(null);

      await expect(service.create(10, { bookId: 5 })).rejects.toMatchObject({
        code: ErrorCode.RESOURCE_NOT_FOUND,
      });
    });
  });

  describe('iptal', () => {
    it('sahibi iptal edebilir', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 1,
        userId: 10,
        status: ReservationStatus.PENDING,
      });

      await service.cancel(1, USER);

      expect(prisma.reservation.update.mock.calls[0][0].data).toEqual({
        status: ReservationStatus.CANCELLED,
        readyUntil: null,
      });
    });

    it('başkasının rezervasyonunu iptal ettirmez', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 1,
        userId: 777,
        status: ReservationStatus.PENDING,
      });

      await expect(service.cancel(1, USER)).rejects.toMatchObject({
        code: ErrorCode.AUTH_FORBIDDEN,
      });
    });

    it('ADMIN herhangi birini iptal edebilir', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 1,
        userId: 777,
        status: ReservationStatus.READY,
      });

      await expect(service.cancel(1, ADMIN)).resolves.toBeDefined();
    });

    it('zaten karşılanmış rezervasyonu iptal ettirmez', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 1,
        userId: 10,
        status: ReservationStatus.FULFILLED,
      });

      await expect(service.cancel(1, USER)).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_FAILED,
      });
    });
  });

  describe('listeleme yetkisi', () => {
    const query = (extra = {}) => ({ page: 1, limit: 10, skip: 0, all: false, ...extra });

    it('USER yalnızca kendi kayıtlarını görür', async () => {
      await service.findAll(query() as any, USER);

      expect(prisma.reservation.count.mock.calls[0][0].where.userId).toBe(USER.id);
    });

    it('USER all=true göndererek başkalarınınkini göremez', async () => {
      await service.findAll(query({ all: true }) as any, USER);

      expect(prisma.reservation.count.mock.calls[0][0].where.userId).toBe(USER.id);
    });

    it('ADMIN all=true ile tümünü görebilir', async () => {
      await service.findAll(query({ all: true }) as any, ADMIN);

      expect(prisma.reservation.count.mock.calls[0][0].where.userId).toBeUndefined();
    });

    it('kuyruk sırasını koruyarak listeler', async () => {
      await service.findAll(query() as any, USER);

      expect(prisma.reservation.findMany.mock.calls[0][0].orderBy).toEqual([
        { bookId: 'asc' },
        { queuePosition: 'asc' },
      ]);
    });
  });
});
