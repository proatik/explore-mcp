import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { completable } from '@modelcontextprotocol/server';

import { productUri } from '@woocommerce-mcp/shared';

import { GROUNDING_RULES } from '@/core/mcp/mcp.constants';
import { ProductService } from '@/modules/product/product.service';
import {
  textMessage,
  loadPromptData,
  resourceMessage,
  numericIdArgument
} from '@/core/mcp/prompt-content';

import type { McpServer, GetPromptResult } from '@modelcontextprotocol/server';

@Injectable()
export class ProductPrompts {
  constructor(private readonly products: ProductService) {}

  register(server: McpServer): void {
    const completeProductId = async (value: string): Promise<string[]> =>
      await this.products.matchingIds(value);

    server.registerPrompt(
      'generate_product_description',
      {
        title: 'Generate a product description',
        description:
          'Draft a product description from the product record, in a chosen tone.',
        argsSchema: z.object({
          productId: completable(
            numericIdArgument('Product ID'),
            completeProductId
          ),
          tone: z
            .enum(['warm', 'minimal', 'playful', 'technical'])
            .optional()
            .describe('Writing tone (default warm)'),
          maxWords: z
            .string()
            .regex(/^\d{2,3}$/, 'Must be between 10 and 999.')
            .optional()
            .describe('Word limit (default 120)')
        })
      },
      async ({ productId, tone, maxWords }, ctx): Promise<GetPromptResult> => {
        const product = await loadPromptData(
          ctx,
          'products:read',
          'product',
          async () =>
            await this.products.get(Number(productId), ctx.mcpReq.signal)
        );

        return {
          description: `Description draft for ${product.name}`,
          messages: [
            textMessage(
              [
                `Write a product description for "${product.name}" in a ${tone ?? 'warm'} tone, at most ${maxWords ?? '120'} words.`,
                'Base every claim on the product record below: name, categories, existing descriptions and price.',
                'Do not invent materials, dimensions, certifications or care instructions that are not in the record. If something useful is missing, list it after the draft as "Details to confirm".',
                'Return the draft only; do not update the product.',
                '',
                GROUNDING_RULES
              ].join('\n')
            ),
            resourceMessage(productUri(product.id), product)
          ]
        };
      }
    );
  }
}
