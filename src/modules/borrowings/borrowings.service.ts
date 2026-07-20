import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  BorrowingStatus,
  Prisma,
  ReservationStatus,
  RoleName,
} from '@prisma/client';

import {
  BORROW_PERIOD_DAYS,
  MAX_ACTIVE_BORROWINGS,
  RESERVATION_PICKUP_DAYS,
  addDays,
} from '../../common/constants/library.constants';
import { paginate } from '../../common/dto/pagination.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code.enum';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBorrowingDto } from './dto/create-borrowing.dto';
import { QueryBorrowingDto } from './dto/query-borrowing.dto';

/** Aktif = henüz iade edilmemiş. */
const ACTIVE_STATUSES = [BorrowingStatus.BORROWED, BorrowingStatus.LATE];

const BORROWING_SELECT = {
  id: true,
  status: true,
  borrowedAt: true,
  dueDate: true,
  returnedAt: true,
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
  book: { select: { id: true, title: true, isbn: true, availableCopies: true } },
} satisfies Prisma.BorrowingSelect;

@Injectable()
export class BorrowingsService {
  private readonly logger = new Logger(BorrowingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kitap ödünç verir.
   *
   * Ödünç kaydı oluşturma ve stok azaltma tek transaction içindedir
   * (şartname: "Transaction Kullanımı"). Stok azaltma koşullu ve atomik
   * tek bir UPDATE ile yapılır — bkz. decrementStock().
   */
  async create(userId: number, dto: CreateBorrowingDto) {
    const borrowing = await this.prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({
        where: { id: dto.bookId },
        select: { id: true, title: true },
      });

      if (!book) {
        throw AppException.notFound('Kitap');
      }

      // BR-03.4 — elindeki kitabı tekrar alamaz
      const alreadyHas = await tx.borrowing.count({
        where: { userId, bookId: dto.bookId, status: { in: ACTIVE_STATUSES } },
      });

      if (alreadyHas > 0) {
        throw new AppException(
          ErrorCode.BORROW_ALREADY_ACTIVE,
          'Bu kitap zaten sizde',
          HttpStatus.CONFLICT,
        );
      }

      // BR-03.5 — aktif ödünç limiti
      const activeCount = await tx.borrowing.count({
        where: { userId, status: { in: ACTIVE_STATUSES } },
      });

      if (activeCount >= MAX_ACTIVE_BORROWINGS) {
        throw new AppException(
          ErrorCode.BORROW_LIMIT_EXCEEDED,
          `Aynı anda en fazla ${MAX_ACTIVE_BORROWINGS} kitap ödünç alabilirsiniz`,
          HttpStatus.CONFLICT,
        );
      }

      await this.decrementStock(tx, dto.bookId);

      const borrowedAt = new Date();

      const created = await tx.borrowing.create({
        data: {
          userId,
          bookId: dto.bookId,
          status: BorrowingStatus.BORROWED,
          borrowedAt,
          dueDate: addDays(borrowedAt, BORROW_PERIOD_DAYS),
        },
        select: BORROWING_SELECT,
      });

      // Kullanıcı bu kitabı rezerve etmişse rezervasyon karşılanmış olur;
      // aksi halde kitap elindeyken rezervasyonu açık kalır ve kuyrukta
      // yer işgal ederdi.
      await tx.reservation.updateMany({
        where: {
          userId,
          bookId: dto.bookId,
          status: { in: [ReservationStatus.PENDING, ReservationStatus.READY] },
        },
        data: { status: ReservationStatus.FULFILLED, readyUntil: null },
      });

      return created;
    });

    this.logger.log(
      `Ödünç verildi: borrowingId=${borrowing.id} userId=${userId} bookId=${dto.bookId}`,
    );

    return borrowing;
  }

  /**
   * Kitabı iade eder: stok geri artar ve varsa sıradaki rezervasyon
   * READY durumuna geçer (BR-04.4).
   */
  async return(id: number, actor: AuthenticatedUser) {
    const result = await this.prisma.$transaction(async (tx) => {
      const borrowing = await tx.borrowing.findUnique({
        where: { id },
        select: { id: true, userId: true, bookId: true, status: true },
      });

      if (!borrowing) {
        throw AppException.notFound('Ödünç kaydı');
      }

      const isOwner = borrowing.userId === actor.id;
      const isAdmin = actor.roles.includes(RoleName.ADMIN);

      if (!isOwner && !isAdmin) {
        throw AppException.forbidden();
      }

      // BR-03.8 — ikinci kez iade edilemez
      if (borrowing.status === BorrowingStatus.RETURNED) {
        throw new AppException(
          ErrorCode.BORROW_ALREADY_RETURNED,
          'Bu kayıt zaten iade edilmiş',
          HttpStatus.CONFLICT,
        );
      }

      const returnedAt = new Date();

      // Stok önce artırılıyor: BORROWING_SELECT kitabın availableCopies
      // değerini de döndürdüğü için, sıra ters olsaydı yanıt iade
      // öncesindeki (eskimiş) stoğu gösterirdi.
      await tx.book.update({
        where: { id: borrowing.bookId },
        data: { availableCopies: { increment: 1 } },
      });

      const updated = await tx.borrowing.update({
        where: { id },
        // status ve returnedAt birlikte yazılıyor; veritabanındaki
        // borrowings_returned_status_consistent kısıtı ikisinin
        // birbiriyle çelişmesine izin vermiyor.
        data: { status: BorrowingStatus.RETURNED, returnedAt },
        select: BORROWING_SELECT,
      });

      const promoted = await this.promoteNextReservation(tx, borrowing.bookId);

      return { updated, promoted };
    });

    this.logger.log(
      `İade alındı: borrowingId=${id} userId=${result.updated.user.id}` +
        (result.promoted ? ` | rezervasyon hazır: ${result.promoted}` : ''),
    );

    return result.updated;
  }

  async findAll(query: QueryBorrowingDto, actor: AuthenticatedUser) {
    const isAdmin = actor.roles.includes(RoleName.ADMIN);

    const where: Prisma.BorrowingWhereInput = {
      // Kullanıcı yalnızca kendi kayıtlarını görür; userId filtresi
      // ADMIN dışında yok sayılır, aksi halde başkasının geçmişi okunabilirdi.
      userId: isAdmin ? query.userId : actor.id,
      status: query.status,
      bookId: query.bookId,
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.borrowing.count({ where }),
      this.prisma.borrowing.findMany({
        where,
        select: BORROWING_SELECT,
        orderBy: [{ borrowedAt: 'desc' }, { id: 'desc' }],
        skip: query.skip,
        take: query.limit,
      }),
    ]);

    return paginate(data, total, query);
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    const borrowing = await this.prisma.borrowing.findUnique({
      where: { id },
      select: BORROWING_SELECT,
    });

    if (!borrowing) {
      throw AppException.notFound('Ödünç kaydı');
    }

    const isOwner = borrowing.user.id === actor.id;

    if (!isOwner && !actor.roles.includes(RoleName.ADMIN)) {
      throw AppException.forbidden();
    }

    return borrowing;
  }

  /**
   * Stoğu koşullu ve atomik olarak bir azaltır.
   *
   * Kritik nokta: okuma ve yazma **tek ifadede** yapılır. Önce
   * `SELECT availableCopies` yapıp sonra `UPDATE` yazsaydık, son kopyayı
   * aynı anda isteyen iki istek de "stok var" görür ve stok -1'e düşerdi
   * (docs/01-is-analizi.md §4). `WHERE availableCopies > 0` koşulu bunu
   * veritabanı seviyesinde imkânsız kılar.
   *
   * Etkilenen satır 0 ise koşul tutmamıştır, yani stok tükenmiştir.
   */
  private async decrementStock(tx: Prisma.TransactionClient, bookId: number) {
    const { count } = await tx.book.updateMany({
      where: { id: bookId, availableCopies: { gt: 0 } },
      data: { availableCopies: { decrement: 1 } },
    });

    if (count === 0) {
      throw new AppException(
        ErrorCode.BOOK_OUT_OF_STOCK,
        'Kitap şu anda mevcut değil',
        HttpStatus.CONFLICT,
      );
    }
  }

  /**
   * BR-04.4 — kitap iade edilince kuyruktaki ilk rezervasyonu READY yapar.
   * Kuyruk sırası queuePosition ile korunur (BR-04.2).
   */
  private async promoteNextReservation(
    tx: Prisma.TransactionClient,
    bookId: number,
  ): Promise<number | null> {
    const next = await tx.reservation.findFirst({
      where: { bookId, status: ReservationStatus.PENDING },
      orderBy: [{ queuePosition: 'asc' }, { reservedAt: 'asc' }],
      select: { id: true },
    });

    if (!next) {
      return null;
    }

    await tx.reservation.update({
      where: { id: next.id },
      data: {
        status: ReservationStatus.READY,
        // CHECK kısıtı READY için readyUntil zorunlu kılıyor.
        readyUntil: addDays(new Date(), RESERVATION_PICKUP_DAYS),
      },
    });

    return next.id;
  }
}
