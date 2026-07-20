import { ApiProperty } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';

export class AuthUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'ayse@ornek.com' })
  email: string;

  @ApiProperty({ example: 'Ayşe' })
  firstName: string;

  @ApiProperty({ example: 'Yılmaz' })
  lastName: string;

  @ApiProperty({ enum: RoleName, isArray: true, example: [RoleName.USER] })
  roles: RoleName[];
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType = 'Bearer';

  @ApiProperty({ example: '15m', description: 'Token geçerlilik süresi' })
  expiresIn: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
