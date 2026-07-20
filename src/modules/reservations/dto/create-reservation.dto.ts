import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ example: 1, description: 'Rezerve edilecek kitabın id’si' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bookId: number;
}
