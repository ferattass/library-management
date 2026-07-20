import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * Global — böylece her modülün ayrı ayrı PrismaModule import etmesi gerekmez.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
