import { Module } from '@nestjs/common';

import { StoreCatalog } from '@/modules/catalog/store-catalog.service';

@Module({
  providers: [StoreCatalog],
  exports: [StoreCatalog]
})
export class CatalogModule {}
