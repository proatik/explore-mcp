import { Module } from '@nestjs/common';

import { CatalogModule } from '@/modules/catalog/catalog.module';
import { ProductController } from '@/modules/product/product.controller';

@Module({
  imports: [CatalogModule],
  controllers: [ProductController]
})
export class ProductModule {}
