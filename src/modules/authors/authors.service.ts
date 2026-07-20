import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AppException } from '../../common/exceptions/app.exception';
import { mapPrismaError } from '../../common/exceptions/prisma-error';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';

const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  biography: true,
  birthDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AuthorSelect;

@Injectable()
export class AuthorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.author.findMany({
      select: {
        ...AUTHOR_SELECT,
        // Yazarın kaç kitabı olduğu listede işe yarar ve tek sorguda gelir.
        _count: { select: { bookAuthors: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: number) {
    const author = await this.prisma.author.findUnique({
      where: { id },
      select: {
        ...AUTHOR_SELECT,
        bookAuthors: {
          select: {
            book: { select: { id: true, title: true, isbn: true, publishedYear: true } },
          },
        },
      },
    });

    if (!author) {
      throw AppException.notFound('Yazar');
    }

    const { bookAuthors, ...rest } = author;

    return { ...rest, books: bookAuthors.map((ba) => ba.book) };
  }

  create(dto: CreateAuthorDto) {
    return this.prisma.author.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        biography: dto.biography,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
      select: AUTHOR_SELECT,
    });
  }

  async update(id: number, dto: UpdateAuthorDto) {
    try {
      return await this.prisma.author.update({
        where: { id },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          biography: dto.biography,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        },
        select: AUTHOR_SELECT,
      });
    } catch (error) {
      mapPrismaError(error, { entity: 'Yazar' });
    }
  }

  /**
   * BR-02.5 — kitabı olan yazar silinemez. Kısıt veritabanında
   * (ON DELETE RESTRICT) tanımlı; burada yalnızca hatayı çeviriyoruz.
   */
  async remove(id: number): Promise<void> {
    try {
      await this.prisma.author.delete({ where: { id } });
    } catch (error) {
      mapPrismaError(error, { entity: 'Yazar' });
    }
  }
}
