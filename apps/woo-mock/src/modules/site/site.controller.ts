import { Get, UseGuards, Controller } from '@nestjs/common';

import { ConsumerKeyGuard } from '@/core/auth/consumer-key.guard';
import { StoreCatalog } from '@/modules/catalog/store-catalog.service';

import type { WooSetting } from '@/modules/catalog/woocommerce.types';

@Controller('wp-json')
export class SiteController {
  constructor(private readonly catalog: StoreCatalog) {}

  @Get()
  getSite() {
    return { ...this.catalog.data.site, namespaces: ['wp/v2', 'wc/v3'] };
  }

  @Get('wc/v3/settings/general')
  @UseGuards(ConsumerKeyGuard)
  getGeneralSettings(): WooSetting[] {
    return this.catalog.data.settings;
  }
}
