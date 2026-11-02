import { z } from 'zod';
import { Injectable } from '@nestjs/common';

import { RESOURCE_URIS } from '@woocommerce-mcp/shared';

import { GROUNDING_RULES } from '@/core/mcp/mcp.constants';
import { ProductService } from '@/modules/product/product.service';
import { CATALOG_LIMIT } from '@/modules/product/product.constants';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '@/modules/inventory/inventory.constants';
import {
  textMessage,
  loadPromptData,
  resourceMessage
} from '@/core/mcp/prompt-content';

import type { McpServer, GetPromptResult } from '@modelcontextprotocol/server';

@Injectable()
export class InventoryPrompts {
  constructor(private readonly products: ProductService) {}

  register(server: McpServer): void {
    server.registerPrompt(
      'analyze_inventory',
      {
        title: 'Analyze inventory',
        description: 'Review stock levels and recommend what to reorder first.',
        argsSchema: z.object({
          threshold: z
            .string()
            .regex(/^\d{1,5}$/)
            .optional()
            .describe(
              `Low-stock threshold (default ${DEFAULT_LOW_STOCK_THRESHOLD})`
            )
        })
      },
      async ({ threshold }, ctx): Promise<GetPromptResult> => {
        const limit = Number(threshold ?? DEFAULT_LOW_STOCK_THRESHOLD);
        const catalog = await loadPromptData(
          ctx,
          'inventory:read',
          'catalog',
          async () =>
            await this.products.list(
              { page: 1, perPage: CATALOG_LIMIT },
              ctx.mcpReq.signal
            )
        );

        const stock = catalog.items.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          manageStock: product.manageStock,
          stockQuantity: product.stockQuantity,
          stockStatus: product.stockStatus
        }));

        const truncationNote =
          catalog.total > stock.length
            ? `Note: the catalog has ${catalog.total} products; only the first ${stock.length} are included.`
            : '';

        return {
          description: `Inventory review (threshold ${limit})`,
          messages: [
            textMessage(
              [
                `Review stock for the ${stock.length} published products below. A product is low when it has ${limit} or fewer units.`,
                'Group products into: out of stock, low stock, healthy, and not stock-managed.',
                'Recommend a reorder priority for low and out-of-stock items, explaining each choice in one line. Use the price as a rough signal of value.',
                'Do not change stock levels. If the user wants changes, suggest the update_stock_quantity tool, which needs approval.',
                truncationNote,
                '',
                GROUNDING_RULES
              ].join('\n')
            ),
            resourceMessage(RESOURCE_URIS.productCatalog, {
              threshold: limit,
              products: stock
            })
          ]
        };
      }
    );
  }
}
