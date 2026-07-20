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
  Query,
} from '@nestjs/common';
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

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /** Kitaba puan ve yorum ekler. Kullanıcı başına kitaba tek yorum. */
  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Yorum ekle' })
  @ApiCreatedResponse({ description: 'Oluşturulan yorum' })
  @ApiConflictResponse({ description: 'REVIEW_DUPLICATE' })
  @ApiNotFoundResponse({ description: 'RESOURCE_NOT_FOUND' })
  create(@CurrentUser('id') userId: number, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(userId, dto);
  }

  /**
   * Yorumları listeler. `meta.averageRating` filtrelenen kümenin
   * ortalama puanını verir.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Yorumları listele' })
  @ApiOkResponse({ description: 'Sayfalanmış yorum listesi + ortalama puan' })
  findAll(@Query() query: QueryReviewDto) {
    return this.reviewsService.findAll(query);
  }

  /** Tek bir yorumu getirir. */
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Yorum detayı' })
  @ApiOkResponse({ description: 'Yorum' })
  @ApiNotFoundResponse({ description: 'RESOURCE_NOT_FOUND' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.findOne(id);
  }

  /** Kendi yorumunu günceller. */
  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Kendi yorumunu güncelle' })
  @ApiOkResponse({ description: 'Güncellenen yorum' })
  @ApiForbiddenResponse({ description: 'AUTH_FORBIDDEN — yalnızca kendi yorumu' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewsService.update(id, dto, user);
  }

  /** Yorumu siler. Sahibi veya ADMIN (moderasyon). */
  @Delete(':id')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Yorum sil (sahibi veya ADMIN)' })
  @ApiNoContentResponse({ description: 'Silindi' })
  @ApiForbiddenResponse({ description: 'AUTH_FORBIDDEN' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.reviewsService.remove(id, user);
  }
}
