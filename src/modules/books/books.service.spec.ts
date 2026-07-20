import { Test, TestingModule } from '@nestjs/testing';
import { BorrowingStatus } from '@prisma/client';

import { ErrorCode } from '../../common/exceptions/error-code.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { BooksService } from './books.service';

describe('BooksService', () => {
  let service: BooksService;
  let prisma: {
    book: { findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock };
    borrowing: { count: jest.Mock };
    publisher: { count: jest.Mock };
    author: { findMany: jest.Mock };
    category: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const bookRow = {
    id: 1,
    title: 'Huzur',
    isbn: null,
    publishedYear: 1949,
    totalCopies: 8,
    availableCopies: 3,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    publisher: { id: 1, name: 'YKY' },
    bookAuthors: [{ author: { id: 1, firstName: 'Ahmet Hamdi', lastName: 'Tanpınar' } }],
    bookCategories: [{ category: { id: 1, name: 'Roman', slug: 'roman' } }],
  };

  beforeEach(async () => {
    prisma = {
      book: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
      borrowing: { count: jest.fn().mockResolvedValue(0) },
      publisher: { count: jest.fn().mockResolvedValue(1) },
      author: { findMany: jest.fn() },
      category: { findMany: jest.fn() },
      // Interactive transaction: callback'i aynı mock ile çalıştır.
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BooksService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(BooksService);
  });

  describe('stok yeniden hesaplama', () => {
    // total=8, available=3 => 5 kopya ödünçte
    const updatedTotal = (n: number) =>
      prisma.book.update.mock.calls[0][0].data.availableCopies;

    beforeEach(() => {
      prisma.book.findUnique.mockResolvedValue({ totalCopies: 8, availableCopies: 3 });
      prisma.book.update.mockResolvedValue(bookRow);
    });

    it('toplam artınca ödünçtekileri koruyarak rafı artırır', async () => {
      await service.update(1, { totalCopies: 10 });

      // 10 - 5 ödünçte = 5 rafta. Doğrudan available=total yapılsaydı
      // 10 olurdu ve ödünçteki kopyalar yok sayılırdı.
      expect(updatedTotal(10)).toBe(5);
    });

    it('toplam azalınca rafı düşürür', async () => {
      await service.update(1, { totalCopies: 6 });

      expect(updatedTotal(6)).toBe(1);
    });

    it('ödünçteki sayıya eşitlemeye izin verir (sınır)', async () => {
      await service.update(1, { totalCopies: 5 });

      expect(updatedTotal(5)).toBe(0);
    });

    it('ödünçteki sayının altına indirmeyi reddeder', async () => {
      await expect(service.update(1, { totalCopies: 4 })).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_FAILED,
      });

      expect(prisma.book.update).not.toHaveBeenCalled();
    });

    it('toplam gönderilmezse stoğa dokunmaz', async () => {
      await service.update(1, { title: 'Yeni Başlık' });

      expect(prisma.book.update.mock.calls[0][0].data.availableCopies).toBeUndefined();
    });

    it('toplam aynı değerle gönderilirse stoğa dokunmaz', async () => {
      await service.update(1, { totalCopies: 8 });

      expect(prisma.book.update.mock.calls[0][0].data.availableCopies).toBeUndefined();
    });

    it('okuma ve yazmayı tek transaction içinde yapar', async () => {
      await service.update(1, { totalCopies: 10 });

      // Transaction dışında olsaydı eşzamanlı iki güncelleme
      // birbirinin hesabını bozardı.
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('silme (BR-02.4)', () => {
    it('aktif ödünç kaydı varsa silmeyi reddeder', async () => {
      prisma.borrowing.count.mockResolvedValue(2);

      await expect(service.remove(1)).rejects.toMatchObject({
        code: ErrorCode.BOOK_HAS_ACTIVE_BORROWINGS,
      });

      expect(prisma.book.delete).not.toHaveBeenCalled();
    });

    it('yalnızca BORROWED ve LATE kayıtları aktif sayar', async () => {
      await service.remove(1);

      expect(prisma.borrowing.count.mock.calls[0][0].where.status.in).toEqual([
        BorrowingStatus.BORROWED,
        BorrowingStatus.LATE,
      ]);
    });

    it('aktif kayıt yoksa siler', async () => {
      await service.remove(1);

      expect(prisma.book.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('ilişki doğrulaması', () => {
    beforeEach(() => {
      prisma.book.findUnique.mockResolvedValue({ totalCopies: 8, availableCopies: 3 });
      prisma.book.update.mockResolvedValue(bookRow);
    });

    it('olmayan yazar id’si için hangi id’nin hatalı olduğunu söyler', async () => {
      prisma.author.findMany.mockResolvedValue([{ id: 1 }]);

      await expect(service.update(1, { authorIds: [1, 9999] })).rejects.toMatchObject({
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: expect.stringContaining('9999'),
      });
    });

    it('olmayan kategori id’sini reddeder', async () => {
      prisma.category.findMany.mockResolvedValue([]);

      await expect(service.update(1, { categoryIds: [42] })).rejects.toMatchObject({
        code: ErrorCode.RESOURCE_NOT_FOUND,
      });
    });

    it('olmayan yayınevini reddeder', async () => {
      prisma.publisher.count.mockResolvedValue(0);

      await expect(service.update(1, { publisherId: 7 })).rejects.toMatchObject({
        code: ErrorCode.RESOURCE_NOT_FOUND,
      });
    });
  });
});
