import { Module } from '@nestjs/common';

import { ProductTools } from '@/modules/product/product.tools';
import { ProductService } from '@/modules/product/product.service';
import { ProductPrompts } from '@/modules/product/product.prompts';
import { ProductResources } from '@/modules/product/product.resources';

@Module({
  providers: [ProductTools, ProductService, ProductPrompts, ProductResources],
  exports: [ProductTools, ProductService, ProductPrompts, ProductResources]
})
export class ProductModule {}
