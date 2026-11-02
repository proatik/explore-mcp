import { Injectable } from '@nestjs/common';

import { RESOURCE_URIS } from '@woocommerce-mcp/shared';

import { JSON_MIME_TYPE } from '@/core/mcp/mcp.constants';
import { StoreService } from '@/modules/store/store.service';
import { readJsonResource } from '@/core/mcp/resource-content';

import type { McpServer } from '@modelcontextprotocol/server';

@Injectable()
export class StoreResources {
  constructor(private readonly store: StoreService) {}

  register(server: McpServer): void {
    server.registerResource(
      'store-info',
      RESOURCE_URIS.storeInfo,
      {
        title: 'Store information',
        description: 'Store name, URL, currency, country and timezone.',
        mimeType: JSON_MIME_TYPE
      },
      async (uri, ctx) =>
        await readJsonResource(
          ctx,
          uri.href,
          'store:read',
          async (signal) => await this.store.getInfo(signal)
        )
    );

    server.registerResource(
      'store-settings',
      RESOURCE_URIS.storeSettings,
      {
        title: 'Store settings',
        description:
          'A safe subset of the general store settings (currency, decimals, tax calculation, location).',
        mimeType: JSON_MIME_TYPE
      },
      async (uri, ctx) =>
        await readJsonResource(
          ctx,
          uri.href,
          'store:read',
          async (signal) => await this.store.getSettings(signal)
        )
    );
  }
}
