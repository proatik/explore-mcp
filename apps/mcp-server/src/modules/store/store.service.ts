import { Injectable } from '@nestjs/common';

import { EXPOSED_SETTING_IDS } from '@/modules/store/store.constants';
import { WooCommerceClient } from '@/core/woocommerce/woocommerce-client';

import type { StoreInfo, StoreSetting } from '@woocommerce-mcp/shared';
import type { RawSite, RawSetting } from '@/core/woocommerce/woocommerce.types';

@Injectable()
export class StoreService {
  constructor(private readonly woocommerce: WooCommerceClient) {}

  async getSettings(signal?: AbortSignal): Promise<StoreSetting[]> {
    const settings = await this.rawSettings(signal);

    return settings
      .filter((setting) => EXPOSED_SETTING_IDS.includes(setting.id))
      .map(({ id, label, value }) => ({ id, label, value }));
  }

  async getInfo(signal?: AbortSignal): Promise<StoreInfo> {
    const [site, settings] = await Promise.all([
      this.woocommerce.getSite<RawSite>(signal),
      this.rawSettings(signal)
    ]);
    const setting = (id: string) =>
      settings.find((item) => item.id === id)?.value ?? '';

    return {
      name: site.data.name,
      description: site.data.description,
      url: site.data.home ?? site.data.url,
      currency: setting('woocommerce_currency'),
      country: setting('woocommerce_default_country'),
      timezone: site.data.timezone_string ?? ''
    };
  }

  private async rawSettings(signal?: AbortSignal): Promise<RawSetting[]> {
    const response = await this.woocommerce.get<RawSetting[]>(
      'settings/general',
      signal ? { signal } : {}
    );

    return response.data;
  }
}
