import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code.enum';
import { mapPrismaError } from '../../common/exceptions/prisma-error';
import { slugify } from '../../common/utils/slugify';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CategorySelect;

const duplicate = () =>
  new AppException(
    ErrorCode.VALIDATION_FAILED,
    'Bu isim veya slug ile bir kategori zaten var',
    HttpStatus.CONFLICT,
  );

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      select: {
        ...CATEGORY_SELECT,
        _count: { select: { bookCategories: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: {
        ...CATEGORY_SELECT,
        bookCategories: {
          select: { book: { select: { id: true, title: true, isbn: true } } },
        },
      },
    });

    if (!category) {
      throw AppException.notFound('Kategori');
    }

    const { bookCategories, ...rest } = category;

    return { ...rest, books: bookCategories.map((bc) => bc.book) };
  }

  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name,
          slug: dto.slug ? slugify(dto.slug) : slugify(dto.name),
          description: dto.description,
        },
        select: CATEGORY_SELECT,
      });
    } catch (error) {
      mapPrismaError(error, { entity: 'Kategori', onUnique: duplicate() });
    }
  }

  async update(id: number, dto: UpdateCategoryDto) {
    // İsim değişip slug verilmediyse slug'ı da güncelliyoruz; aksi halde
    // "Bilim Kurgu" -> "Fantastik" olduğunda slug 'bilim-kurgu' kalırdı.
    const slug = dto.slug
      ? slugify(dto.slug)
      : dto.name
        ? slugify(dto.name)
        : undefined;

    try {
      return await this.prisma.category.update({
        where: { id },
        data: { name: dto.name, slug, description: dto.description },
        select: CATEGORY_SELECT,
      });
    } catch (error) {
      mapPrismaError(error, { entity: 'Kategori', onUnique: duplicate() });
    }
  }

  /** BR-02.5 — kitabı olan kategori silinemez. */
  async remove(id: number): Promise<void> {
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      mapPrismaError(error, { entity: 'Kategori' });
    }
  }
}
