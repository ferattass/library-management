import { Test, TestingModule } from '@nestjs/testing';
import { BorrowingStatus, ReservationStatus, RoleName } from '@prisma/client';

import { MAX_ACTIVE_BORROWINGS } from '../../common/constants/library.constants';
import { ErrorCode } from '../../common/exceptions/error-code.enum';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import { BorrowingsService } from './borrowings.service';

describe('BorrowingsService', () => {
  let service: BorrowingsService;
  let prisma: any;

  const USER: AuthenticatedUser = {
    id: 10,
    email: 'u@x.com',
    roles: [RoleName.USER],
  };
  const ADMIN: AuthenticatedUser = {
    id: 99,
    email: 'a@x.com',
    roles: [RoleName.ADMIN],
  };

  const borrowingRow = {
    id: 1,
    status: BorrowingStatus.BORROWED,
    borrowedAt: new Date(),
    dueDate: new Date(),
    returnedAt: null,
    user: { id: 10, email: 'u@x.com', firstName: 'A', lastName: 'B' },
    book: { id: 5, title: 'Huzur', isbn: null, availableCopies: 2 },
  };

  beforeEach(async () => {
    prisma = {
      book: {
        findUnique: jest.fn().mockResolvedValue({ id: 5, title: 'Huzur' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      borrowing: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue(borrowingRow),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue(borrowingRow),
      },
      reservation: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BorrowingsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(BorrowingsService);
  });

  describe('ödünç alma', () => {
    it('stoğu koşullu tek UPDATE ile azaltır', async () => {
      await service.create(10, { bookId: 5 });

      // Kritik: WHERE içinde availableCopies > 0 koşulu olmalı.
      // Önce SELECT sonra UPDATE yapılsaydı, son kopyayı aynı anda
      // isteyen iki istek de "stok var" görür ve stok -1'e düşerdi.
      expect(prisma.book.updateMany).toHaveBeenCalledWith({
        where: { id: 5, availableCopies: { gt: 0 } },
        data: { availableCopies: { decrement: 1 } },
      });
    });

    it('koşul tutmazsa (etkilenen satır 0) stok tükenmiş sayar', async () => {
      prisma.book.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.create(10, { bookId: 5 })).rejects.toMatchObject({
        code: ErrorCode.BOOK_OUT_OF_STOCK,
      });

      expect(prisma.borrowing.create).not.toHaveBeenCalled();
    });

    it('kayıt oluşturma ve stok azaltmayı tek transaction içinde yapar', async () => {
      await service.create(10, { bookId: 5 });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('stoğu düşürmeden önce iş kurallarını kontrol eder', async () => {
      // Limit aşımında stok azaltılmamalı; sıra ters olsaydı reddedilen
      // istek stoktan bir kopya eksiltirdi.
      prisma.borrowing.count.mockResolvedValueOnce(0).mockResolvedValueOnce(
        MAX_ACTIVE_BORROWINGS,
      );

      await expect(service.create(10, { bookId: 5 })).rejects.toMatchObject({
        code: ErrorCode.BORROW_LIMIT_EXCEEDED,
      });

      expect(prisma.book.updateMany).not.toHaveBeenCalled();
    });

    it('elindeki kitabı tekrar almayı reddeder', async () => {
      prisma.borrowing.count.mockResolvedValueOnce(1);

      await expect(service.create(10, { bookId: 5 })).rejects.toMatchObject({
        code: ErrorCode.BORROW_ALREADY_ACTIVE,
      });
    });

    it('olmayan kitap için 404 döner', async () => {
      prisma.book.findUnique.mockResolvedValue(null);

      await expect(service.create(10, { bookId: 5 })).rejects.toMatchObject({
        code: ErrorCode.RESOURCE_NOT_FOUND,
      });
    });

    it('varsa kullanıcının o kitaba ait rezervasyonunu karşılanmış yapar', async () => {
      await service.create(10, { bookId: 5 });

      expect(prisma.reservation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: ReservationStatus.FULFILLED, readyUntil: null },
        }),
      );
    });

    it('vade tarihini ödünç tarihinden sonraya koyar', async () => {
      await service.create(10, { bookId: 5 });

      const { borrowedAt, dueDate } = prisma.borrowing.create.mock.calls[0][0].data;

      // CHECK kısıtı due_date > borrowed_at zorunlu kılıyor.
      expect(dueDate.getTime()).toBeGreaterThan(borrowedAt.getTime());
    });
  });

  describe('iade', () => {
    beforeEach(() => {
      prisma.borrowing.findUnique.mockResolvedValue({
        id: 1,
        userId: 10,
        bookId: 5,
        status: BorrowingStatus.BORROWED,
      });
    });

    it('stoğu geri artırır', async () => {
      await service.return(1, USER);

      expect(prisma.book.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { availableCopies: { increment: 1 } },
      });
    });

    it('stoğu ödünç kaydını okumadan ÖNCE artırır', async () => {
      await service.return(1, USER);

      // Yanıt kitabın availableCopies değerini de taşıyor; sıra ters
      // olsaydı istemciye iade öncesi eskimiş stok dönerdi.
      const stockOrder = prisma.book.update.mock.invocationCallOrder[0];
      const updateOrder = prisma.borrowing.update.mock.invocationCallOrder[0];

      expect(stockOrder).toBeLessThan(updateOrder);
    });

    it('status ve returnedAt alanlarını birlikte yazar', async () => {
      await service.return(1, USER);

      const { status, returnedAt } = prisma.borrowing.update.mock.calls[0][0].data;

      // borrowings_returned_status_consistent kısıtı ikisinin
      // çelişmesine izin vermiyor.
      expect(status).toBe(BorrowingStatus.RETURNED);
      expect(returnedAt).toBeInstanceOf(Date);
    });

    it('ikinci kez iadeyi reddeder', async () => {
      prisma.borrowing.findUnique.mockResolvedValue({
        id: 1,
        userId: 10,
        bookId: 5,
        status: BorrowingStatus.RETURNED,
      });

      await expect(service.return(1, USER)).rejects.toMatchObject({
        code: ErrorCode.BORROW_ALREADY_RETURNED,
      });

      expect(prisma.book.update).not.toHaveBeenCalled();
    });

    it('başkasının kaydını iade etmeyi engeller', async () => {
      await expect(
        service.return(1, { ...USER, id: 777 }),
      ).rejects.toMatchObject({ code: ErrorCode.AUTH_FORBIDDEN });
    });

    it('ADMIN herhangi bir kaydı iade edebilir', async () => {
      await expect(service.return(1, ADMIN)).resolves.toBeDefined();
    });

    it('kuyruktaki ilk rezervasyonu READY yapar ve son tarih verir', async () => {
      prisma.reservation.findFirst.mockResolvedValue({ id: 42 });

      await service.return(1, USER);

      const data = prisma.reservation.update.mock.calls[0][0].data;

      expect(data.status).toBe(ReservationStatus.READY);
      // CHECK kısıtı READY için readyUntil zorunlu kılıyor.
      expect(data.readyUntil).toBeInstanceOf(Date);
    });

    it('kuyruğu sıra numarasına göre ilerletir', async () => {
      prisma.reservation.findFirst.mockResolvedValue({ id: 42 });

      await service.return(1, USER);

      expect(prisma.reservation.findFirst.mock.calls[0][0].orderBy).toEqual([
        { queuePosition: 'asc' },
        { reservedAt: 'asc' },
      ]);
    });

    it('bekleyen rezervasyon yoksa sorunsuz tamamlar', async () => {
      await expect(service.return(1, USER)).resolves.toBeDefined();
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });
  });

  describe('yetki izolasyonu', () => {
    beforeEach(() => {
      prisma.borrowing.count = jest.fn().mockResolvedValue(0);
      prisma.borrowing.findMany = jest.fn().mockResolvedValue([]);
      prisma.$transaction = jest.fn().mockResolvedValue([0, []]);
    });

    it('USER için sorguyu kendi id’sine kilitler', async () => {
      await service.findAll({ page: 1, limit: 10, skip: 0 } as any, USER);

      expect(prisma.borrowing.count.mock.calls[0][0].where.userId).toBe(USER.id);
    });

    it('USER’ın userId filtresini yok sayar', async () => {
      // Yok sayılmasaydı istemci ?userId=1 ile başkasının geçmişini okurdu.
      await service.findAll({ page: 1, limit: 10, skip: 0, userId: 1 } as any, USER);

      expect(prisma.borrowing.count.mock.calls[0][0].where.userId).toBe(USER.id);
    });

    it('ADMIN userId ile filtreleyebilir', async () => {
      await service.findAll({ page: 1, limit: 10, skip: 0, userId: 7 } as any, ADMIN);

      expect(prisma.borrowing.count.mock.calls[0][0].where.userId).toBe(7);
    });

    it('ADMIN filtre vermezse tümünü görür', async () => {
      await service.findAll({ page: 1, limit: 10, skip: 0 } as any, ADMIN);

      expect(prisma.borrowing.count.mock.calls[0][0].where.userId).toBeUndefined();
    });
  });
});
