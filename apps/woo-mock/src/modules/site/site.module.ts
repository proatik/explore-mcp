import { Module } from '@nestjs/common';

import { SiteController } from '@/modules/site/site.controller';
import { CatalogModule } from '@/modules/catalog/catalog.module';

@Module({
  imports: [CatalogModule],
  controllers: [SiteController]
})
export class SiteModule {}
