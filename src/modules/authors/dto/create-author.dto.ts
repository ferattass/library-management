import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAuthorDto {
  @ApiProperty({ example: 'J.K.' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName: string;

  @ApiProperty({ example: 'Rowling' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName: string;

  @ApiPropertyOptional({ example: 'İngiliz yazar, Harry Potter serisinin yaratıcısı.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  biography?: string;

  @ApiPropertyOptional({ example: '1965-07-31', description: 'ISO 8601 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;
}
