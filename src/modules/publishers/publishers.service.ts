import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code.enum';
import { mapPrismaError } from '../../common/exceptions/prisma-error';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { UpdatePublisherDto } from './dto/update-publisher.dto';

const PUBLISHER_SELECT = {
  id: true,
  name: true,
  website: true,
  address: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PublisherSelect;

const duplicate = () =>
  new AppException(
    ErrorCode.VALIDATION_FAILED,
    'Bu isimde bir yayınevi zaten var',
    HttpStatus.CONFLICT,
  );

@Injectable()
export class PublishersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.publisher.findMany({
      select: { ...PUBLISHER_SELECT, _count: { select: { books: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const publisher = await this.prisma.publisher.findUnique({
      where: { id },
      select: {
        ...PUBLISHER_SELECT,
        books: { select: { id: true, title: true, isbn: true, publishedYear: true } },
      },
    });

    if (!publisher) {
      throw AppException.notFound('Yayınevi');
    }

    return publisher;
  }

  async create(dto: CreatePublisherDto) {
    try {
      return await this.prisma.publisher.create({
        data: dto,
        select: PUBLISHER_SELECT,
      });
    } catch (error) {
      mapPrismaError(error, { entity: 'Yayınevi', onUnique: duplicate() });
    }
  }

  async update(id: number, dto: UpdatePublisherDto) {
    try {
      return await this.prisma.publisher.update({
        where: { id },
        data: dto,
        select: PUBLISHER_SELECT,
      });
    } catch (error) {
      mapPrismaError(error, { entity: 'Yayınevi', onUnique: duplicate() });
    }
  }

  /** BR-02.5 — kitabı olan yayınevi silinemez. */
  async remove(id: number): Promise<void> {
    try {
      await this.prisma.publisher.delete({ where: { id } });
    } catch (error) {
      mapPrismaError(error, { entity: 'Yayınevi' });
    }
  }
}
