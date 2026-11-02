import { Module } from '@nestjs/common';

import { CatalogModule } from '@/modules/catalog/catalog.module';
import { OrderController } from '@/modules/order/order.controller';

@Module({
  imports: [CatalogModule],
  controllers: [OrderController]
})
export class OrderModule {}
