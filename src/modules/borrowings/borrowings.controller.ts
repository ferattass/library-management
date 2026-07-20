import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { BorrowingsService } from './borrowings.service';
import { CreateBorrowingDto } from './dto/create-borrowing.dto';
import { QueryBorrowingDto } from './dto/query-borrowing.dto';

@ApiTags('borrowings')
@ApiBearerAuth('access-token')
@Controller('borrowings')
export class BorrowingsController {
  constructor(private readonly borrowingsService: BorrowingsService) {}

  /**
   * Kitap ödünç alır. Stok kontrolü yapılır; kayıt oluşturma ve stok
   * azaltma tek transaction içinde çalışır.
   */
  @Post()
  @ApiOperation({ summary: 'Kitap ödünç al' })
  @ApiCreatedResponse({ description: 'Oluşturulan ödünç kaydı' })
  @ApiConflictResponse({
    description:
      'BOOK_OUT_OF_STOCK | BORROW_ALREADY_ACTIVE | BORROW_LIMIT_EXCEEDED',
  })
  @ApiNotFoundResponse({ description: 'RESOURCE_NOT_FOUND' })
  create(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateBorrowingDto,
  ) {
    return this.borrowingsService.create(userId, dto);
  }

  /**
   * Ödünç kaydını iade eder. Stok geri artar, kuyruktaki ilk rezervasyon
   * varsa READY durumuna geçer.
   */
  @Patch(':id/return')
  @ApiOperation({ summary: 'Kitabı iade et' })
  @ApiOkResponse({ description: 'Güncellenen ödünç kaydı' })
  @ApiConflictResponse({ description: 'BORROW_ALREADY_RETURNED' })
  @ApiNotFoundResponse({ description: 'RESOURCE_NOT_FOUND' })
  return(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.borrowingsService.return(id, user);
  }

  /**
   * Ödünç kayıtlarını listeler. USER yalnızca kendi kayıtlarını görür,
   * ADMIN tümünü görür ve `userId` ile filtreleyebilir.
   */
  @Get()
  @ApiOperation({ summary: 'Ödünç kayıtlarını listele' })
  @ApiOkResponse({ description: 'Sayfalanmış ödünç listesi' })
  findAll(
    @Query() query: QueryBorrowingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.borrowingsService.findAll(query, user);
  }

  /** Tek bir ödünç kaydını getirir. */
  @Get(':id')
  @ApiOperation({ summary: 'Ödünç kaydı detayı' })
  @ApiOkResponse({ description: 'Ödünç kaydı' })
  @ApiNotFoundResponse({ description: 'RESOURCE_NOT_FOUND' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.borrowingsService.findOne(id, user);
  }
}
