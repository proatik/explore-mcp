import { z } from 'zod';
import { Injectable } from '@nestjs/common';

import { RESOURCE_URIS } from '@woocommerce-mcp/shared';

import { GROUNDING_RULES } from '@/core/mcp/mcp.constants';
import { SalesService } from '@/modules/sales/sales.service';
import {
  textMessage,
  loadPromptData,
  resourceMessage
} from '@/core/mcp/prompt-content';

import type { McpServer, GetPromptResult } from '@modelcontextprotocol/server';

@Injectable()
export class SalesPrompts {
  constructor(private readonly sales: SalesService) {}

  register(server: McpServer): void {
    server.registerPrompt(
      'summarize_sales',
      {
        title: 'Summarize sales',
        description:
          'Summarize recent sales: revenue, order counts by status and best-selling products.',
        argsSchema: z.object({
          days: z
            .enum(['7', '30', '90'])
            .optional()
            .describe('Look-back period in days (default 30)')
        })
      },
      async ({ days }, ctx): Promise<GetPromptResult> => {
        const period = Number(days ?? 30);
        const summary = await loadPromptData(
          ctx,
          'orders:read',
          'orders',
          async () =>
            await this.sales.summarizeRecent(period, ctx.mcpReq.signal)
        );

        return {
          description: `Sales summary for the last ${period} days`,
          messages: [
            textMessage(
              [
                `Summarize store sales for the last ${period} days for a weekly business review.`,
                'The figures below were computed by the server from the order records. Quote them; do not recompute or estimate others.',
                'Include: revenue, number of orders, average order value, status breakdown, top products, and one or two observations.',
                '',
                GROUNDING_RULES
              ].join('\n')
            ),
            resourceMessage(RESOURCE_URIS.salesReport, summary)
          ]
        };
      }
    );
  }
}
