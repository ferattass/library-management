import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthorsService } from './authors.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';

@ApiTags('authors')
@Controller('authors')
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  /** Tüm yazarları listeler. */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Yazarları listele' })
  @ApiOkResponse({ description: 'Yazar listesi (kitap sayılarıyla)' })
  findAll() {
    return this.authorsService.findAll();
  }

  /** Bir yazarı ve kitaplarını getirir. */
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Yazar detayı' })
  @ApiOkResponse({ description: 'Yazar bilgisi ve kitapları' })
  @ApiNotFoundResponse({ description: 'RESOURCE_NOT_FOUND' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.authorsService.findOne(id);
  }

  /** Yeni yazar ekler. */
  @Roles(RoleName.ADMIN)
  @ApiBearerAuth('access-token')
  @Post()
  @ApiOperation({ summary: 'Yazar ekle (ADMIN)' })
  @ApiCreatedResponse({ description: 'Oluşturulan yazar' })
  @ApiForbiddenResponse({ description: 'AUTH_FORBIDDEN' })
  create(@Body() dto: CreateAuthorDto) {
    return this.authorsService.create(dto);
  }

  /** Yazar bilgilerini kısmen günceller. */
  @Roles(RoleName.ADMIN)
  @ApiBearerAuth('access-token')
  @Patch(':id')
  @ApiOperation({ summary: 'Yazar güncelle (ADMIN)' })
  @ApiOkResponse({ description: 'Güncellenen yazar' })
  @ApiNotFoundResponse({ description: 'RESOURCE_NOT_FOUND' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAuthorDto) {
    return this.authorsService.update(id, dto);
  }

  /** Yazarı siler. Kitabı olan yazar silinemez (BR-02.5). */
  @Roles(RoleName.ADMIN)
  @ApiBearerAuth('access-token')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Yazar sil (ADMIN)' })
  @ApiNoContentResponse({ description: 'Silindi' })
  @ApiConflictResponse({ description: 'Yazarın kitapları var — silinemez' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.authorsService.remove(id);
  }
}
