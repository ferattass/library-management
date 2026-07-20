import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'page 1 veya daha büyük olmalıdır' })
  page = 1;

  @ApiPropertyOptional({ example: 10, default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  // Üst sınır olmasaydı ?limit=1000000 ile tek istekte tüm tablo çekilebilir,
  // bu da kolay bir kaynak tüketme yoluna dönüşürdü.
  @Max(100, { message: 'limit en fazla 100 olabilir' })
  limit = 10;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
}

export function paginate<T>(
  data: T[],
  total: number,
  { page, limit }: { page: number; limit: number },
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasPrevious: page > 1,
      // totalPages değil total üzerinden bakılıyor: total=0 iken
      // totalPages=0 olur ve page=1 > 0 karşılaştırması yanıltıcı olurdu.
      hasNext: page * limit < total,
    },
  };
}
