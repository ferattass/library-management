import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreatePublisherDto {
  @ApiProperty({ example: 'Yapı Kredi Yayınları' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ example: 'https://www.yapikrediyayinlari.com.tr' })
  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'Geçerli bir URL giriniz (https://...)' })
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ example: 'İstiklal Cad. No:161, Beyoğlu/İstanbul' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
