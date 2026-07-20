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
import { CreateReservationDto } from './dto/create-reservation.dto';
import { QueryReservationDto } from './dto/query-reservation.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('reservations')
@ApiBearerAuth('access-token')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  /** Kitabı rezerve eder ve kuyruğun sonuna ekler. */
  @Post()
  @ApiOperation({ summary: 'Rezervasyon oluştur' })
  @ApiCreatedResponse({ description: 'Oluşturulan rezervasyon (sıra numarasıyla)' })
  @ApiConflictResponse({
    description: 'RESERVATION_DUPLICATE | RESERVATION_BOOK_IN_HAND',
  })
  @ApiNotFoundResponse({ description: 'RESOURCE_NOT_FOUND' })
  create(@CurrentUser('id') userId: number, @Body() dto: CreateReservationDto) {
    return this.reservationsService.create(userId, dto);
  }

  /**
   * Rezervasyonları listeler. USER yalnızca kendi kayıtlarını görür;
   * ADMIN `?all=true` ile tümünü görebilir.
   */
  @Get()
  @ApiOperation({ summary: 'Rezervasyonları listele' })
  @ApiOkResponse({ description: 'Sayfalanmış rezervasyon listesi' })
  findAll(
    @Query() query: QueryReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationsService.findAll(query, user);
  }

  /** Rezervasyonu iptal eder. */
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Rezervasyonu iptal et' })
  @ApiOkResponse({ description: 'İptal edilen rezervasyon' })
  @ApiConflictResponse({ description: 'Zaten iptal edilmiş veya karşılanmış' })
  @ApiNotFoundResponse({ description: 'RESOURCE_NOT_FOUND' })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationsService.cancel(id, user);
  }
}
