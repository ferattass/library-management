import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';

import { paginate } from '../../common/dto/pagination.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code.enum';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

const REVIEW_SELECT = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
  // E-posta bilinçli olarak dışarıda: yorumlar herkese açık okunuyor,
  // e-posta eklenirse tüm kullanıcıların adresleri kimlik doğrulamasız
  // toplanabilir hale gelirdi.
  user: { select: { id: true, firstName: true, lastName: true } },
  book: { select: { id: true, title: true } },
} satisfies Prisma.ReviewSelect;

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateReviewDto) {
    const book = await this.prisma.book.findUnique({
      where: { id: dto.bookId },
      select: { id: true },
    });

    if (!book) {
      throw AppException.notFound('Kitap');
    }

    try {
      const review = await this.prisma.review.create({
        data: {
          userId,
          bookId: dto.bookId,
          rating: dto.rating,
          comment: dto.comment,
        },
        select: REVIEW_SELECT,
      });

      this.logger.log(
        `Yorum eklendi: reviewId=${review.id} userId=${userId} bookId=${dto.bookId}`,
      );

      return review;
    } catch (error) {
      // BR-05.2 — kullanıcı başına kitaba tek yorum.
      // Ön kontrol yerine UNIQUE kısıtını yakalıyoruz: "önce sorgula sonra
      // yaz" iki eşzamanlı istek arasında yarış durumu bırakır.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppException(
          ErrorCode.REVIEW_DUPLICATE,
          'Bu kitaba zaten yorum yaptınız',
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }
  }

  async findAll(query: QueryReviewDto) {
    const where: Prisma.ReviewWhereInput = {
      bookId: query.bookId,
      userId: query.userId,
      rating: query.minRating ? { gte: query.minRating } : undefined,
    };

    const [total, data, stats] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        select: REVIEW_SELECT,
        // İkincil anahtar olmadan aynı puana sahip yorumların sırası
        // sayfalar arasında değişebilirdi.
        orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'desc' }],
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.review.aggregate({ where, _avg: { rating: true } }),
    ]);

    const result = paginate(data, total, query);

    return {
      ...result,
      meta: {
        ...result.meta,
        // Ortalama puan aynı transaction içinde hesaplanıyor; ayrı
        // sorgu olsaydı liste ile ortalama farklı anlara ait olabilirdi.
        averageRating: stats._avg.rating
          ? Math.round(stats._avg.rating * 100) / 100
          : null,
      },
    };
  }

  async findOne(id: number) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: REVIEW_SELECT,
    });

    if (!review) {
      throw AppException.notFound('Yorum');
    }

    return review;
  }

  /** BR-05.3 — kullanıcı yalnızca kendi yorumunu güncelleyebilir. */
  async update(id: number, dto: UpdateReviewDto, actor: AuthenticatedUser) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!review) {
      throw AppException.notFound('Yorum');
    }

    // Güncellemede ADMIN ayrıcalığı yok: moderasyon silme yetkisiyle
    // yapılır, başkasının yorumunun içeriğini değiştirmekle değil.
    if (review.userId !== actor.id) {
      throw AppException.forbidden();
    }

    return this.prisma.review.update({
      where: { id },
      data: { rating: dto.rating, comment: dto.comment },
      select: REVIEW_SELECT,
    });
  }

  /** BR-05.3 — sahibi veya ADMIN (moderasyon) silebilir. */
  async remove(id: number, actor: AuthenticatedUser): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!review) {
      throw AppException.notFound('Yorum');
    }

    const isOwner = review.userId === actor.id;

    if (!isOwner && !actor.roles.includes(RoleName.ADMIN)) {
      throw AppException.forbidden();
    }

    await this.prisma.review.delete({ where: { id } });

    this.logger.log(
      `Yorum silindi: reviewId=${id} silen=${actor.id}${isOwner ? '' : ' (moderasyon)'}`,
    );
  }
}
