import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { QueryBookDto } from './dto/query-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  /**
   * Kitapları listeler. Sayfalama, arama, filtreleme ve sıralama destekler.
   *
   * Örnekler:
   * - `/api/books?page=2&limit=20`
   * - `/api/books?search=huzur`
   * - `/api/books?category=Roman&author=Tanpınar`
   * - `/api/books?sortBy=publishedYear&sortOrder=desc`
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Kitapları listele (sayfalama, arama, filtre, sıralama)' })
  @ApiOkResponse({ description: 'Sayfalanmış kitap listesi: { data, meta }' })
  findAll(@Query() query: QueryBookDto) {
    return this.booksService.findAll(query);
  }

  /** Tek bir kitabın detayını getirir. */
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Kitap detayı' })
  @ApiOkResponse({ description: 'Kitap bilgisi' })
  @ApiNotFoundResponse({ description: 'RESOURCE_NOT_FOUND' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findOne(id);
  }

  /** Yeni kitap ekler; birden fazla yazar ve kategori atanabilir. */
  @Roles(RoleName.ADMIN)
  @ApiBearerAuth('access-token')
  @Post()
  @ApiOperation({ summary: 'Kitap ekle (ADMIN)' })
  @ApiCreatedResponse({ description: 'Oluşturulan kitap' })
  @ApiConflictResponse({ description: 'BOOK_ISBN_TAKEN' })
  @ApiNotFoundResponse({ description: 'Yayınevi/yazar/kategori bulunamadı' })
  create(@Body() dto: CreateBookDto) {
    return this.booksService.create(dto);
  }

  /**
   * Kitabı kısmen günceller. `authorIds`/`categoryIds` gönderilirse
   * mevcut ilişkilerin yerini alır.
   */
  @Roles(RoleName.ADMIN)
  @ApiBearerAuth('access-token')
  @Patch(':id')
  @ApiOperation({ summary: 'Kitap güncelle (ADMIN)' })
  @ApiOkResponse({ description: 'Güncellenen kitap' })
  @ApiConflictResponse({ description: 'ISBN çakışması veya stok tutarsızlığı' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto);
  }

  /** Kitabı siler. Aktif ödünç kaydı varsa silinemez (BR-02.4). */
  @Roles(RoleName.ADMIN)
  @ApiBearerAuth('access-token')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Kitap sil (ADMIN)' })
  @ApiNoContentResponse({ description: 'Silindi' })
  @ApiConflictResponse({ description: 'BOOK_HAS_ACTIVE_BORROWINGS' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.booksService.remove(id);
  }
}
