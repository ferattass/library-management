import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ayse@ornek.com' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({ example: 'Guclu123!' })
  @IsString()
  // Girişte şifre politikası uygulanmaz; yalnızca alanın var olduğu
  // doğrulanır. Politika değişirse eski şifreliler kilitlenmemeli.
  @MinLength(1)
  @MaxLength(72)
  password: string;
}
