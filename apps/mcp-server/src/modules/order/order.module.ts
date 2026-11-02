import { Module } from '@nestjs/common';

import { OrderTools } from '@/modules/order/order.tools';
import { OrderService } from '@/modules/order/order.service';
import { OrderPrompts } from '@/modules/order/order.prompts';
import { OrderResources } from '@/modules/order/order.resources';

@Module({
  providers: [OrderTools, OrderService, OrderPrompts, OrderResources],
  exports: [OrderTools, OrderService, OrderPrompts, OrderResources]
})
export class OrderModule {}
