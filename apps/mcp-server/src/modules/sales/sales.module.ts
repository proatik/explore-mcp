import { Module } from '@nestjs/common';

import { OrderModule } from '@/modules/order/order.module';
import { SalesPrompts } from '@/modules/sales/sales.prompts';
import { SalesService } from '@/modules/sales/sales.service';

@Module({
  imports: [OrderModule],
  providers: [SalesPrompts, SalesService],
  exports: [SalesPrompts]
})
export class SalesModule {}
