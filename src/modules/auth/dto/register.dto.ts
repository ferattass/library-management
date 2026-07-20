import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'ayse@ornek.com' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({
    example: 'Guclu123!',
    minLength: 8,
    description: 'En az 8 karakter, en az bir harf ve bir rakam içermeli',
  })
  @IsString()
  // bcrypt 72 bayttan sonrasını yok sayar; sınırı burada koyarak
  // kullanıcının "şifrem kabul edildi ama uzunluğu önemsizmiş" durumuna
  // düşmesini engelliyoruz.
  @MaxLength(72)
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır' })
  @Matches(/(?=.*[A-Za-zÇĞİÖŞÜçğıöşü])(?=.*\d)/, {
    message: 'Şifre en az bir harf ve bir rakam içermelidir',
  })
  password: string;

  @ApiProperty({ example: 'Ayşe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName: string;

  @ApiProperty({ example: 'Yılmaz' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName: string;
}
