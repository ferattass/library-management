import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 1, description: 'Yorum yapılan kitabın id’si' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bookId: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5, description: 'Puan (BR-05.1)' })
  @Type(() => Number)
  @IsInt({ message: 'Puan tam sayı olmalıdır' })
  // Aynı aralık veritabanında CHECK kısıtı ile de zorlanıyor; buradaki
  // doğrulama kullanıcıya anlamlı bir mesaj vermek için.
  @Min(1, { message: 'Puan 1 ile 5 arasında olmalıdır' })
  @Max(5, { message: 'Puan 1 ile 5 arasında olmalıdır' })
  rating: number;

  @ApiPropertyOptional({ example: 'Türk edebiyatının en iyi romanlarından.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }: { value: string }) => value?.trim())
  comment?: string;
}
