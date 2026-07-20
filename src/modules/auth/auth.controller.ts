import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Yeni kullanıcı kaydı oluşturur ve USER rolü atar. */
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Kayıt ol' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: 'AUTH_EMAIL_TAKEN — e-posta zaten kayıtlı' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  /** E-posta ve şifre ile giriş yapar, access token döner. */
  @Public()
  @Post('login')
  // Varsayılan 201 yerine 200 — giriş yeni bir kaynak oluşturmaz.
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Giriş yap' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'AUTH_INVALID_CREDENTIALS' })
  @ApiForbiddenResponse({ description: 'AUTH_ACCOUNT_DISABLED' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  /** Geçerli token'ın sahibini döner — koruma altındaki bir endpoint örneği. */
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Oturum sahibini getir' })
  @ApiOkResponse({ description: 'Doğrulanmış kullanıcı bilgisi' })
  @ApiUnauthorizedResponse({ description: 'AUTH_TOKEN_INVALID' })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
