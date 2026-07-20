import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export enum ReviewSortBy {
  CreatedAt = 'createdAt',
  Rating = 'rating',
}

export enum SortOrder {
  Asc = 'asc',
  Desc = 'desc',
}

export class QueryReviewDto extends PaginationDto {
  @ApiPropertyOptional({ example: 1, description: 'Kitaba göre filtrele' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bookId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Kullanıcıya göre filtrele' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ enum: ReviewSortBy, default: ReviewSortBy.CreatedAt })
  @IsOptional()
  @IsEnum(ReviewSortBy)
  sortBy: ReviewSortBy = ReviewSortBy.CreatedAt;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.Desc })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.Desc;
}
