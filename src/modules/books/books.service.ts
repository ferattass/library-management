import { HttpStatus, Injectable } from '@nestjs/common';
import { BorrowingStatus, Prisma } from '@prisma/client';

import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code.enum';
import { mapPrismaError } from '../../common/exceptions/prisma-error';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

const BOOK_SELECT = {
  id: true,
  title: true,
  isbn: true,
  publishedYear: true,
  totalCopies: true,
  availableCopies: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  publisher: { select: { id: true, name: true } },
  bookAuthors: {
    select: { author: { select: { id: true, firstName: true, lastName: true } } },
  },
  bookCategories: {
    select: { category: { select: { id: true, name: true, slug: true } } },
  },
} satisfies Prisma.BookSelect;

type BookRow = Prisma.BookGetPayload<{ select: typeof BOOK_SELECT }>;

const isbnTaken = () =>
  new AppException(
    ErrorCode.BOOK_ISBN_TAKEN,
    'Bu ISBN zaten kayıtlı',
    HttpStatus.CONFLICT,
  );

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const books = await this.prisma.book.findMany({
      select: BOOK_SELECT,
      orderBy: { title: 'asc' },
    });

    return books.map(flatten);
  }

  async findOne(id: number) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      select: BOOK_SELECT,
    });

    if (!book) {
      throw AppException.notFound('Kitap');
    }

    return flatten(book);
  }

  async create(dto: CreateBookDto) {
    await this.assertReferencesExist(dto.publisherId, dto.authorIds, dto.categoryIds);

    try {
      const book = await this.prisma.book.create({
        data: {
          title: dto.title,
          isbn: dto.isbn,
          publisherId: dto.publisherId,
          publishedYear: dto.publishedYear,
          totalCopies: dto.totalCopies,
          // Yeni kitabın tamamı raftadır.
          availableCopies: dto.totalCopies,
          description: dto.description,
          bookAuthors: {
            create: dto.authorIds.map((authorId) => ({ authorId })),
          },
          bookCategories: {
            create: dto.categoryIds.map((categoryId) => ({ categoryId })),
          },
        },
        select: BOOK_SELECT,
      });

      return flatten(book);
    } catch (error) {
      mapPrismaError(error, { entity: 'Kitap', onUnique: isbnTaken() });
    }
  }

  async update(id: number, dto: UpdateBookDto) {
    await this.assertReferencesExist(dto.publisherId, dto.authorIds, dto.categoryIds);

    try {
      // Stok hesabı okunan değere dayandığı için okuma ve yazma aynı
      // transaction içinde olmalı; aksi halde eşzamanlı iki güncelleme
      // birbirinin hesabını bozar.
      const book = await this.prisma.$transaction(async (tx) => {
        const current = await tx.book.findUnique({
          where: { id },
          select: { totalCopies: true, availableCopies: true },
        });

        if (!current) {
          throw AppException.notFound('Kitap');
        }

        const availableCopies = this.recalculateAvailable(current, dto.totalCopies);

        return tx.book.update({
          where: { id },
          data: {
            title: dto.title,
            isbn: dto.isbn,
            publisherId: dto.publisherId,
            publishedYear: dto.publishedYear,
            totalCopies: dto.totalCopies,
            availableCopies,
            description: dto.description,

            // Liste gönderildiyse mevcut ilişkilerin yerini alır.
            ...(dto.authorIds && {
              bookAuthors: {
                deleteMany: {},
                create: dto.authorIds.map((authorId) => ({ authorId })),
              },
            }),
            ...(dto.categoryIds && {
              bookCategories: {
                deleteMany: {},
                create: dto.categoryIds.map((categoryId) => ({ categoryId })),
              },
            }),
          },
          select: BOOK_SELECT,
        });
      });

      return flatten(book);
    } catch (error) {
      mapPrismaError(error, { entity: 'Kitap', onUnique: isbnTaken() });
    }
  }

  /** BR-02.4 — aktif ödünç kaydı olan kitap silinemez. */
  async remove(id: number): Promise<void> {
    const activeBorrowings = await this.prisma.borrowing.count({
      where: {
        bookId: id,
        status: { in: [BorrowingStatus.BORROWED, BorrowingStatus.LATE] },
      },
    });

    if (activeBorrowings > 0) {
      throw new AppException(
        ErrorCode.BOOK_HAS_ACTIVE_BORROWINGS,
        `Kitabın ${activeBorrowings} aktif ödünç kaydı var, silinemez`,
        HttpStatus.CONFLICT,
      );
    }

    try {
      await this.prisma.book.delete({ where: { id } });
    } catch (error) {
      mapPrismaError(error, { entity: 'Kitap' });
    }
  }

  /**
   * totalCopies değişince availableCopies'i aynı miktarda kaydırır.
   *
   * Doğrudan availableCopies = totalCopies yapmak, ödünçteki kopyaları
   * yok sayıp stoğu şişirirdi. Fark üzerinden gitmek ödünçtekileri korur.
   */
  private recalculateAvailable(
    current: { totalCopies: number; availableCopies: number },
    newTotal: number | undefined,
  ): number | undefined {
    if (newTotal === undefined || newTotal === current.totalCopies) {
      return undefined;
    }

    const borrowed = current.totalCopies - current.availableCopies;
    const next = newTotal - borrowed;

    if (next < 0) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        `Şu anda ${borrowed} kopya ödünçte; toplam kopya sayısı ${borrowed} altına indirilemez`,
        HttpStatus.CONFLICT,
      );
    }

    return next;
  }

  /**
   * İlişkili kayıtların varlığını önceden doğrular.
   *
   * Foreign key kısıtı bunu zaten engelliyor, ama ham P2003 hatası
   * "hangi id yanlıştı" bilgisini vermez. Kısıt yine de yarış durumlarına
   * karşı son savunma hattı olarak duruyor.
   */
  private async assertReferencesExist(
    publisherId?: number,
    authorIds?: number[],
    categoryIds?: number[],
  ): Promise<void> {
    if (publisherId !== undefined) {
      const exists = await this.prisma.publisher.count({ where: { id: publisherId } });

      if (exists === 0) {
        throw AppException.notFound(`Yayınevi (id: ${publisherId})`);
      }
    }

    if (authorIds?.length) {
      const found = await this.prisma.author.findMany({
        where: { id: { in: authorIds } },
        select: { id: true },
      });

      const missing = authorIds.filter((id) => !found.some((a) => a.id === id));

      if (missing.length) {
        throw AppException.notFound(`Yazar (id: ${missing.join(', ')})`);
      }
    }

    if (categoryIds?.length) {
      const found = await this.prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true },
      });

      const missing = categoryIds.filter((id) => !found.some((c) => c.id === id));

      if (missing.length) {
        throw AppException.notFound(`Kategori (id: ${missing.join(', ')})`);
      }
    }
  }
}

/** Ara tablo sarmalayıcılarını düzleştirir: bookAuthors[].author -> authors[] */
function flatten(book: BookRow) {
  const { bookAuthors, bookCategories, ...rest } = book;

  return {
    ...rest,
    authors: bookAuthors.map((ba) => ba.author),
    categories: bookCategories.map((bc) => bc.category),
  };
}
