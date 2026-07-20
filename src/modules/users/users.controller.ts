import { Controller, Get, ParseIntPipe, Param } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { UsersService, type UserSummary } from './users.service';

/**
 * Tüm endpoint'ler ADMIN gerektirir — rol bazlı yetkilendirmenin
 * (Sprint 2) uygulandığı yer.
 */
@ApiTags('users')
@ApiBearerAuth('access-token')
@Roles(RoleName.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Tüm kullanıcıları listeler. */
  @Get()
  @ApiOperation({ summary: 'Kullanıcıları listele (ADMIN)' })
  @ApiOkResponse({ description: 'Kullanıcı listesi' })
  @ApiUnauthorizedResponse({ description: 'AUTH_TOKEN_INVALID' })
  @ApiForbiddenResponse({ description: 'AUTH_FORBIDDEN — ADMIN rolü gerekli' })
  findAll(): Promise<UserSummary[]> {
    return this.usersService.findAll();
  }

  /** Tek bir kullanıcıyı getirir. */
  @Get(':id')
  @ApiOperation({ summary: 'Kullanıcı detayı (ADMIN)' })
  @ApiOkResponse({ description: 'Kullanıcı bilgisi' })
  @ApiForbiddenResponse({ description: 'AUTH_FORBIDDEN — ADMIN rolü gerekli' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<UserSummary> {
    return this.usersService.findOne(id);
  }
}
