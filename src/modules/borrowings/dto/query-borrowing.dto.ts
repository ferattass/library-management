import { ApiPropertyOptional } from '@nestjs/swagger';
import { BorrowingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryBorrowingDto extends PaginationDto {
  @ApiPropertyOptional({ enum: BorrowingStatus })
  @IsOptional()
  @IsEnum(BorrowingStatus)
  status?: BorrowingStatus;

  @ApiPropertyOptional({ example: 1, description: 'Kitaba göre filtrele' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bookId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Kullanıcıya göre filtrele — yalnızca ADMIN için geçerlidir',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}
