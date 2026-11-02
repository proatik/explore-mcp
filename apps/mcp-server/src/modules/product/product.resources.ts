import { Injectable } from '@nestjs/common';
import { ResourceTemplate } from '@modelcontextprotocol/server';

import { productUri, RESOURCE_URIS } from '@woocommerce-mcp/shared';

import { hasScope } from '@/core/auth/scope-guard';
import { JSON_MIME_TYPE } from '@/core/mcp/mcp.constants';
import { ProductService } from '@/modules/product/product.service';
import { templateId, readJsonResource } from '@/core/mcp/resource-content';
import {
  CATALOG_LIMIT,
  RESOURCE_LIST_LIMIT
} from '@/modules/product/product.constants';

import type { McpServer } from '@modelcontextprotocol/server';

@Injectable()
export class ProductResources {
  constructor(private readonly products: ProductService) {}

  register(server: McpServer): void {
    server.registerResource(
      'product-catalog',
      RESOURCE_URIS.productCatalog,
      {
        title: 'Product catalog snapshot',
        description: `Compact list of up to ${CATALOG_LIMIT} published products. Use the list_products tool to page through larger catalogs.`,
        mimeType: JSON_MIME_TYPE
      },
      async (uri, ctx) =>
        await readJsonResource(
          ctx,
          uri.href,
          'products:read',
          async (signal) => {
            const page = await this.products.list(
              { page: 1, perPage: CATALOG_LIMIT },
              signal
            );

            return {
              products: page.items.map((product) => ({
                id: product.id,
                name: product.name,
                sku: product.sku,
                price: product.price,
                stockStatus: product.stockStatus,
                stockQuantity: product.stockQuantity,
                uri: productUri(product.id)
              })),
              total: page.total,
              truncated: page.total > page.items.length
            };
          }
        )
    );

    server.registerResource(
      'product',
      new ResourceTemplate(RESOURCE_URIS.productTemplate, {
        list: async (ctx) => {
          if (!hasScope(ctx.http?.authInfo, 'products:read'))
            return { resources: [] };

          const page = await this.products.list(
            { page: 1, perPage: RESOURCE_LIST_LIMIT },
            ctx.mcpReq.signal
          );

          return {
            resources: page.items.map((product) => ({
              uri: productUri(product.id),
              name: `product-${product.id}`,
              title: product.name,
              mimeType: JSON_MIME_TYPE
            }))
          };
        },
        complete: {
          productId: async (value) => await this.products.matchingIds(value)
        }
      }),
      {
        title: 'Product',
        description: 'Full details of one product by ID.',
        mimeType: JSON_MIME_TYPE
      },
      async (uri, variables, ctx) =>
        await readJsonResource(
          ctx,
          uri.href,
          'products:read',
          async (signal) =>
            await this.products.get(
              templateId(variables, 'productId', uri.href),
              signal
            )
        )
    );
  }
}
