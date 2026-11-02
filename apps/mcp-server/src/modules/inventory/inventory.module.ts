import { Module } from '@nestjs/common';

import { ProductModule } from '@/modules/product/product.module';
import { InventoryTools } from '@/modules/inventory/inventory.tools';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { InventoryPrompts } from '@/modules/inventory/inventory.prompts';

@Module({
  imports: [ProductModule],
  providers: [InventoryTools, InventoryService, InventoryPrompts],
  exports: [InventoryTools, InventoryPrompts]
})
export class InventoryModule {}
