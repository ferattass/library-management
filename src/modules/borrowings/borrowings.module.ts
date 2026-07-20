import { Module } from '@nestjs/common';

import { BorrowingsController } from './borrowings.controller';
import { BorrowingsService } from './borrowings.service';

@Module({
  controllers: [BorrowingsController],
  providers: [BorrowingsService],
  exports: [BorrowingsService],
})
export class BorrowingsModule {}
