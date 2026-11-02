import { Injectable } from '@nestjs/common';
import { ResourceTemplate } from '@modelcontextprotocol/server';

import { RESOURCE_URIS } from '@woocommerce-mcp/shared';

import { JSON_MIME_TYPE } from '@/core/mcp/mcp.constants';
import { OrderService } from '@/modules/order/order.service';
import { templateId, readJsonResource } from '@/core/mcp/resource-content';

import type { McpServer } from '@modelcontextprotocol/server';

@Injectable()
export class OrderResources {
  constructor(private readonly orders: OrderService) {}

  register(server: McpServer): void {
    server.registerResource(
      'order',
      new ResourceTemplate(RESOURCE_URIS.orderTemplate, {
        // orders are never listed, so resource listing cannot browse customer activity.
        list: undefined,
        complete: {
          orderId: async (value) => await this.orders.matchingIds(value)
        }
      }),
      {
        title: 'Order',
        description:
          'One order by ID, with line items and notes. Customer contact details are masked.',
        mimeType: JSON_MIME_TYPE
      },
      async (uri, variables, ctx) =>
        await readJsonResource(
          ctx,
          uri.href,
          'orders:read',
          async (signal) =>
            await this.orders.get(
              templateId(variables, 'orderId', uri.href),
              signal
            )
        )
    );
  }
}
