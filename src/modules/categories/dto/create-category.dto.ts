import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Bilim Kurgu' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    example: 'bilim-kurgu',
    description: 'Verilmezse isimden otomatik üretilir',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @ApiPropertyOptional({ example: 'Bilimsel kurgu ve gelecek temalı eserler.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
