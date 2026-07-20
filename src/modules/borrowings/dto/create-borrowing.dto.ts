import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateBorrowingDto {
  @ApiProperty({ example: 1, description: 'Ödünç alınacak kitabın id’si' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bookId: number;
}
