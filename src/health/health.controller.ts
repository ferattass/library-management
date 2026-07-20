import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Uygulamanın ve veritabanı bağlantısının durumunu döner. */
  @Get()
  @ApiOperation({ summary: 'Sağlık kontrolü' })
  @ApiOkResponse({
    schema: {
      example: { status: 'ok', database: 'up', timestamp: '2026-07-20T09:00:00.000Z' },
    },
  })
  async check() {
    let database = 'down';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      // Bağlantı yoksa uygulama hâlâ ayakta olabilir; bunu 'down' olarak
      // raporlarız, isteği hata ile düşürmeyiz.
    }

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
