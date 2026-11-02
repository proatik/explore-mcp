import { Module } from '@nestjs/common';

import { CatalogModule } from '@/modules/catalog/catalog.module';
import { CustomerController } from '@/modules/customer/customer.controller';

@Module({
  imports: [CatalogModule],
  controllers: [CustomerController]
})
export class CustomerModule {}
