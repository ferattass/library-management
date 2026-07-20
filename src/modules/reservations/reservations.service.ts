import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  BorrowingStatus,
  Prisma,
  ReservationStatus,
  RoleName,
} from '@prisma/client';

import { paginate } from '../../common/dto/pagination.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code.enum';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { QueryReservationDto } from './dto/query-reservation.dto';

/** Aktif = kuyrukta yer tutan durumlar. */
const ACTIVE_STATUSES = [ReservationStatus.PENDING, ReservationStatus.READY];

const RESERVATION_SELECT = {
  id: true,
  status: true,
  queuePosition: true,
  reservedAt: true,
  readyUntil: true,
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
  book: { select: { id: true, title: true, isbn: true, availableCopies: true } },
} satisfies Prisma.ReservationSelect;

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Rezervasyon oluşturur ve kuyruğun sonuna ekler (BR-04.2).
   */
  async create(userId: number, dto: CreateReservationDto) {
    const reservation = await this.prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({
        where: { id: dto.bookId },
        select: { id: true },
      });

      if (!book) {
        throw AppException.notFound('Kitap');
      }

      // BR-04.3 — kitap zaten elindeyken rezervasyon anlamsızdır
      const hasBook = await tx.borrowing.count({
        where: {
          userId,
          bookId: dto.bookId,
          status: { in: [BorrowingStatus.BORROWED, BorrowingStatus.LATE] },
        },
      });

      if (hasBook > 0) {
        throw new AppException(
          ErrorCode.RESERVATION_BOOK_IN_HAND,
          'Bu kitap şu anda sizde',
          HttpStatus.CONFLICT,
        );
      }

      // Kitap satırını kilitleyerek aynı kitap için eşzamanlı rezervasyonları
      // sıraya sokuyoruz. Kilit olmasaydı iki istek de aynı queuePosition'ı
      // hesaplayıp kuyruk sırasını (BR-04.2) bozardı.
      await tx.$queryRaw`SELECT id FROM books WHERE id = ${dto.bookId} FOR UPDATE`;

      const last = await tx.reservation.findFirst({
        where: { bookId: dto.bookId, status: { in: ACTIVE_STATUSES } },
        orderBy: { queuePosition: 'desc' },
        select: { queuePosition: true },
      });

      try {
        return await tx.reservation.create({
          data: {
            userId,
            bookId: dto.bookId,
            status: ReservationStatus.PENDING,
            queuePosition: (last?.queuePosition ?? 0) + 1,
          },
          select: RESERVATION_SELECT,
        });
      } catch (error) {
        // BR-04.1 — kısmi unique index yalnızca PENDING/READY satırlarını
        // kapsar, yani iptal edilmiş rezervasyondan sonra tekrar denenebilir.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new AppException(
            ErrorCode.RESERVATION_DUPLICATE,
            'Bu kitap için zaten aktif bir rezervasyonunuz var',
            HttpStatus.CONFLICT,
          );
        }

        throw error;
      }
    });

    this.logger.log(
      `Rezervasyon: reservationId=${reservation.id} userId=${userId} ` +
        `bookId=${dto.bookId} sira=${reservation.queuePosition}`,
    );

    return reservation;
  }

  async findAll(query: QueryReservationDto, actor: AuthenticatedUser) {
    const isAdmin = actor.roles.includes(RoleName.ADMIN);

    const where: Prisma.ReservationWhereInput = {
      // `all` yalnızca ADMIN için geçerli; USER her koşulda kendi
      // kayıtlarına kilitlenir.
      userId: isAdmin && query.all ? undefined : actor.id,
      status: query.status,
      bookId: query.bookId,
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.reservation.count({ where }),
      this.prisma.reservation.findMany({
        where,
        select: RESERVATION_SELECT,
        // Kuyruk sırası korunur: önce kitap, sonra sıra numarası.
        orderBy: [{ bookId: 'asc' }, { queuePosition: 'asc' }],
        skip: query.skip,
        take: query.limit,
      }),
    ]);

    return paginate(data, total, query);
  }

  /** Rezervasyonu iptal eder; kuyruktaki yerini bırakır. */
  async cancel(id: number, actor: AuthenticatedUser) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });

    if (!reservation) {
      throw AppException.notFound('Rezervasyon');
    }

    const isOwner = reservation.userId === actor.id;

    if (!isOwner && !actor.roles.includes(RoleName.ADMIN)) {
      throw AppException.forbidden();
    }

    if (!ACTIVE_STATUSES.includes(reservation.status as (typeof ACTIVE_STATUSES)[number])) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        `Rezervasyon ${reservation.status} durumunda, iptal edilemez`,
        HttpStatus.CONFLICT,
      );
    }

    return this.prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELLED, readyUntil: null },
      select: RESERVATION_SELECT,
    });
  }
}
