import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, RoleName } from '@prisma/client';

import { ErrorCode } from '../../common/exceptions/error-code.enum';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import { ReviewsService } from './reviews.service';
import { ReviewSortBy, SortOrder } from './dto/query-review.dto';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: any;

  const USER: AuthenticatedUser = { id: 10, email: 'u@x.com', roles: [RoleName.USER] };
  const ADMIN: AuthenticatedUser = { id: 99, email: 'a@x.com', roles: [RoleName.ADMIN] };

  const row = {
    id: 1,
    rating: 5,
    comment: 'Harika',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: 10, firstName: 'A', lastName: 'B' },
    book: { id: 5, title: 'Huzur' },
  };

  const query = (extra = {}) =>
    ({
      page: 1,
      limit: 10,
      skip: 0,
      sortBy: ReviewSortBy.CreatedAt,
      sortOrder: SortOrder.Desc,
      ...extra,
    }) as any;

  beforeEach(async () => {
    prisma = {
      book: { findUnique: jest.fn().mockResolvedValue({ id: 5 }) },
      review: {
        create: jest.fn().mockResolvedValue(row),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue(row),
        delete: jest.fn().mockResolvedValue(row),
        count: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
      $transaction: jest.fn().mockResolvedValue([2, [row], { _avg: { rating: 4.5 } }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ReviewsService);
  });

  describe('yorum ekleme', () => {
    it('yorumu oluşturur', async () => {
      const result = await service.create(10, { bookId: 5, rating: 5, comment: 'İyi' });

      expect(prisma.review.create.mock.calls[0][0].data).toMatchObject({
        userId: 10,
        bookId: 5,
        rating: 5,
      });
      expect(result.id).toBe(1);
    });

    it('aynı kitaba ikinci yorumu reddeder (BR-05.2)', async () => {
      prisma.review.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: '7.0.0',
        }),
      );

      await expect(
        service.create(10, { bookId: 5, rating: 4 }),
      ).rejects.toMatchObject({ code: ErrorCode.REVIEW_DUPLICATE });
    });

    it('olmayan kitaba yorum yapılamaz', async () => {
      prisma.book.findUnique.mockResolvedValue(null);

      await expect(
        service.create(10, { bookId: 5, rating: 4 }),
      ).rejects.toMatchObject({ code: ErrorCode.RESOURCE_NOT_FOUND });

      expect(prisma.review.create).not.toHaveBeenCalled();
    });

    it('beklenmeyen veritabanı hatasını yutmaz', async () => {
      prisma.review.create.mockRejectedValue(new Error('bağlantı koptu'));

      await expect(service.create(10, { bookId: 5, rating: 4 })).rejects.toThrow(
        'bağlantı koptu',
      );
    });
  });

  describe('listeleme', () => {
    it('ortalama puanı liste ile aynı transaction içinde hesaplar', async () => {
      const result = await service.findAll(query({ bookId: 5 }));

      // Ayrı sorgu olsaydı liste ile ortalama farklı anlara ait olabilirdi.
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.meta.averageRating).toBe(4.5);
    });

    it('ortalamayı iki ondalığa yuvarlar', async () => {
      prisma.$transaction.mockResolvedValue([3, [row], { _avg: { rating: 4.33333 } }]);

      expect((await service.findAll(query())).meta.averageRating).toBe(4.33);
    });

    it('yorum yokken ortalama null olur', async () => {
      prisma.$transaction.mockResolvedValue([0, [], { _avg: { rating: null } }]);

      const result = await service.findAll(query());

      // 0 dönseydi "hiç yorum yok" ile "ortalama 0" ayırt edilemezdi.
      expect(result.meta.averageRating).toBeNull();
      expect(result.meta.total).toBe(0);
    });

    it('minRating filtresini gte olarak uygular', async () => {
      await service.findAll(query({ minRating: 4 }));

      const where = prisma.$transaction.mock.calls[0][0];

      expect(where).toHaveLength(3);
    });

    it('yanıtta kullanıcı e-postası sızdırmaz', async () => {
      // Yorumlar kimlik doğrulamasız okunuyor; e-posta eklenirse tüm
      // kullanıcı adresleri toplanabilir hale gelirdi.
      const result = await service.findAll(query());

      expect(JSON.stringify(result)).not.toContain('@');
    });
  });

  describe('güncelleme', () => {
    beforeEach(() => {
      prisma.review.findUnique.mockResolvedValue({ id: 1, userId: 10 });
    });

    it('sahibi kendi yorumunu güncelleyebilir', async () => {
      await service.update(1, { rating: 3 }, USER);

      expect(prisma.review.update.mock.calls[0][0].data.rating).toBe(3);
    });

    it('başkasının yorumu güncellenemez', async () => {
      await expect(
        service.update(1, { rating: 1 }, { ...USER, id: 777 }),
      ).rejects.toMatchObject({ code: ErrorCode.AUTH_FORBIDDEN });
    });

    it('ADMIN bile başkasının yorumunu güncelleyemez', async () => {
      // Moderasyon silmeyle yapılır; başkasının sözünü değiştirmekle değil.
      await expect(service.update(1, { rating: 1 }, ADMIN)).rejects.toMatchObject({
        code: ErrorCode.AUTH_FORBIDDEN,
      });
    });

    it('olmayan yorum için 404', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await expect(service.update(1, { rating: 3 }, USER)).rejects.toMatchObject({
        code: ErrorCode.RESOURCE_NOT_FOUND,
      });
    });
  });

  describe('silme', () => {
    beforeEach(() => {
      prisma.review.findUnique.mockResolvedValue({ id: 1, userId: 10 });
    });

    it('sahibi silebilir', async () => {
      await service.remove(1, USER);

      expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('ADMIN moderasyon amacıyla silebilir', async () => {
      await service.remove(1, ADMIN);

      expect(prisma.review.delete).toHaveBeenCalled();
    });

    it('başkasının yorumunu normal kullanıcı silemez', async () => {
      await expect(
        service.remove(1, { ...USER, id: 777 }),
      ).rejects.toMatchObject({ code: ErrorCode.AUTH_FORBIDDEN });

      expect(prisma.review.delete).not.toHaveBeenCalled();
    });
  });
});
