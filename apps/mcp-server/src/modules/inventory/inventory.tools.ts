import { z } from 'zod';
import { Injectable } from '@nestjs/common';

import { StockLevelSchema } from '@woocommerce-mcp/shared';

import { guardTool } from '@/core/mcp/guard-tool';
import { reportProgress } from '@/core/mcp/progress';
import { toolSuccess } from '@/core/mcp/tool-result';
import { IdempotencyStore } from '@/core/mcp/idempotency-store';
import { idSchema, idempotencyKeySchema } from '@/core/mcp/tool-input';
import { InventoryService } from '@/modules/inventory/inventory.service';
import {
  MAX_STOCK_DELTA,
  DEFAULT_LOW_STOCK_THRESHOLD
} from '@/modules/inventory/inventory.constants';

import type { McpServer } from '@modelcontextprotocol/server';

const GetStockStatusInputSchema = z.object({
  productId: idSchema('product')
    .optional()
    .describe(
      'Check one product. Omit to scan the whole catalog for low stock.'
    ),
  threshold: z
    .number()
    .int()
    .min(0)
    .max(10_000)
    .default(DEFAULT_LOW_STOCK_THRESHOLD)
    .describe(
      'When scanning, report products with stock at or below this level'
    ),
  includeOutOfStock: z.boolean().default(true)
});

const UpdateStockInputSchema = z.object({
  productId: idSchema('product'),
  operation: z
    .enum(['set', 'increment', 'decrement'])
    .describe('Set an absolute quantity, or adjust the current one'),
  quantity: z.number().int().min(0).max(100_000),
  expectedCurrentQuantity: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      'Optimistic concurrency check: the update is rejected if current stock differs from this'
    ),
  reason: z
    .string()
    .trim()
    .min(3)
    .max(200)
    .describe('Why the stock is changing, for the audit log'),
  idempotencyKey: idempotencyKeySchema
});

type GetStockStatusInput = z.infer<typeof GetStockStatusInputSchema>;

type UpdateStockInput = z.infer<typeof UpdateStockInputSchema>;

@Injectable()
export class InventoryTools {
  constructor(
    private readonly inventory: InventoryService,
    private readonly idempotency: IdempotencyStore
  ) {}

  register(server: McpServer): void {
    server.registerTool(
      'get_stock_status',
      {
        title: 'Get stock status',
        description:
          'Check stock for one product, or scan the catalog for products at or below a stock threshold. Catalog scans report progress and can be cancelled.',
        inputSchema: GetStockStatusInputSchema,
        outputSchema: z.object({
          products: z.array(StockLevelSchema),
          scannedProducts: z.number().int(),
          threshold: z.number().int().nullable()
        }),
        annotations: { readOnlyHint: true, openWorldHint: true }
      },
      guardTool(
        {
          name: 'get_stock_status',
          scope: 'inventory:read',
          subject: 'product'
        },
        async (args: GetStockStatusInput, { ctx, signal }) => {
          if (args.productId !== undefined) {
            const level = await this.inventory.getLevel(args.productId, signal);

            return toolSuccess({
              products: [level],
              scannedProducts: 1,
              threshold: null
            });
          }

          const scan = await this.inventory.scanLowStock(
            {
              threshold: args.threshold,
              includeOutOfStock: args.includeOutOfStock,
              onPage: async (page, totalPages, scanned) => {
                await reportProgress(
                  ctx,
                  page,
                  totalPages,
                  `Scanned ${scanned} products`
                );
              }
            },
            signal
          );

          return toolSuccess(
            { ...scan, threshold: args.threshold },
            `${scan.products.length} of ${scan.scannedProducts} published products have ${args.threshold} or fewer units in stock.`
          );
        }
      )
    );

    server.registerTool(
      'update_stock_quantity',
      {
        title: 'Update stock quantity',
        description: `Set or adjust a product's stock quantity. One call may change stock by at most ${MAX_STOCK_DELTA} units and never below zero. Pass expectedCurrentQuantity to guard against concurrent changes. Requires human approval in well-behaved clients.`,
        inputSchema: UpdateStockInputSchema,
        outputSchema: z.object({
          productId: z.number().int(),
          name: z.string(),
          previousQuantity: z.number().int(),
          newQuantity: z.number().int(),
          stockStatus: z.string()
        }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true
        }
      },
      guardTool(
        {
          name: 'update_stock_quantity',
          scope: 'inventory:write',
          subject: 'product'
        },
        async (args: UpdateStockInput, { auth, signal }) =>
          await this.idempotency.run(
            {
              clientId: auth.clientId,
              tool: 'update_stock_quantity',
              key: args.idempotencyKey
            },
            args,
            async () => {
              const adjusted = await this.inventory.adjustStock(args, signal);

              return toolSuccess(
                { ...adjusted },
                `Stock for "${adjusted.name}" changed from ${adjusted.previousQuantity} to ${adjusted.newQuantity}.`
              );
            }
          )
      )
    );
  }
}
