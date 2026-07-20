import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * Sıralanabilir alanlar beyaz listedir. Serbest metin kabul edilseydi
 * istemci `orderBy` ile şemadaki herhangi bir kolona — veya geçersiz bir
 * ada — erişmeye çalışabilirdi.
 */
export enum BookSortBy {
  Title = 'title',
  PublishedYear = 'publishedYear',
  CreatedAt = 'createdAt',
  AvailableCopies = 'availableCopies',
}

export enum SortOrder {
  Asc = 'asc',
  Desc = 'desc',
}

export class QueryBookDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 'huzur',
    description: 'Kitap başlığı veya yazar adında geçen metin (büyük/küçük harf duyarsız)',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ example: 'Roman', description: 'Kategori adı veya slug' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }: { value: string }) => value?.trim())
  category?: string;

  @ApiPropertyOptional({ example: 'Tanpınar', description: 'Yazarın adı veya soyadı' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  author?: string;

  @ApiPropertyOptional({ example: 'Yapı Kredi', description: 'Yayınevi adı' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }: { value: string }) => value?.trim())
  publisher?: string;

  @ApiPropertyOptional({ enum: BookSortBy, default: BookSortBy.Title })
  @IsOptional()
  @IsEnum(BookSortBy, {
    message: `sortBy şunlardan biri olmalı: ${Object.values(BookSortBy).join(', ')}`,
  })
  sortBy: BookSortBy = BookSortBy.Title;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.Asc })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.Asc;
}
