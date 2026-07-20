import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBookDto {
  @ApiProperty({ example: 'Harry Potter ve Felsefe Taşı' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.trim())
  title: string;

  @ApiPropertyOptional({
    example: '9789750802461',
    description: 'ISBN-10 veya ISBN-13. Verilirse benzersiz olmalıdır (BR-02.1).',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$|^[0-9]{13}$|^[0-9-]{13,17}$/, {
    message: 'ISBN 10 veya 13 haneli olmalıdır (tire kullanılabilir)',
  })
  @MaxLength(20)
  isbn?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  publisherId: number;

  @ApiPropertyOptional({ example: 2001 })
  @IsOptional()
  @IsInt()
  @Min(1450, { message: 'Matbaadan önceki bir yıl olamaz' })
  // SMALLINT üst sınırı 32767; ayrıca gelecekteki bir yıl mantıksız olurdu.
  @Max(2100)
  publishedYear?: number;

  @ApiProperty({ example: 5, description: 'Kütüphanedeki toplam kopya sayısı' })
  @IsInt()
  @Min(0)
  @Max(100000)
  totalCopies: number;

  @ApiPropertyOptional({ example: 'Serinin ilk kitabı.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({
    example: [1],
    description: 'En az bir yazar zorunludur (BR-02.2)',
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Kitabın en az bir yazarı olmalıdır' })
  @ArrayUnique({ message: 'Aynı yazar birden fazla kez eklenemez' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  authorIds: number[];

  @ApiProperty({
    example: [1],
    description: 'En az bir kategori zorunludur (BR-02.2)',
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Kitabın en az bir kategorisi olmalıdır' })
  @ArrayUnique({ message: 'Aynı kategori birden fazla kez eklenemez' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  categoryIds: number[];
}
