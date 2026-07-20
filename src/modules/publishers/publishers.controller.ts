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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { UpdatePublisherDto } from './dto/update-publisher.dto';
import { PublishersService } from './publishers.service';

@ApiTags('publishers')
@Controller('publishers')
export class PublishersController {
  constructor(private readonly publishersService: PublishersService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Yayınevlerini listele' })
  @ApiOkResponse({ description: 'Yayınevi listesi (kitap sayılarıyla)' })
  findAll() {
    return this.publishersService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Yayınevi detayı' })
  @ApiNotFoundResponse({ description: 'RESOURCE_NOT_FOUND' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.publishersService.findOne(id);
  }

  @Roles(RoleName.ADMIN)
  @ApiBearerAuth('access-token')
  @Post()
  @ApiOperation({ summary: 'Yayınevi ekle (ADMIN)' })
  @ApiCreatedResponse({ description: 'Oluşturulan yayınevi' })
  @ApiConflictResponse({ description: 'Aynı isim zaten var' })
  create(@Body() dto: CreatePublisherDto) {
    return this.publishersService.create(dto);
  }

  @Roles(RoleName.ADMIN)
  @ApiBearerAuth('access-token')
  @Patch(':id')
  @ApiOperation({ summary: 'Yayınevi güncelle (ADMIN)' })
  @ApiOkResponse({ description: 'Güncellenen yayınevi' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePublisherDto) {
    return this.publishersService.update(id, dto);
  }

  @Roles(RoleName.ADMIN)
  @ApiBearerAuth('access-token')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Yayınevi sil (ADMIN)' })
  @ApiNoContentResponse({ description: 'Silindi' })
  @ApiConflictResponse({ description: 'Yayınevinin kitapları var — silinemez' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.publishersService.remove(id);
  }
}
