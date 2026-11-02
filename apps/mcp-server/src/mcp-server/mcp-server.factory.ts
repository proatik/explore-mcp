import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/server';

import { OrderTools } from '@/modules/order/order.tools';
import { SalesPrompts } from '@/modules/sales/sales.prompts';
import { OrderPrompts } from '@/modules/order/order.prompts';
import { ProductTools } from '@/modules/product/product.tools';
import { OrderResources } from '@/modules/order/order.resources';
import { StoreResources } from '@/modules/store/store.resources';
import { CustomerTools } from '@/modules/customer/customer.tools';
import { ProductPrompts } from '@/modules/product/product.prompts';
import { InventoryTools } from '@/modules/inventory/inventory.tools';
import { ProductResources } from '@/modules/product/product.resources';
import { InventoryPrompts } from '@/modules/inventory/inventory.prompts';
import {
  SERVER_INFO,
  SERVER_INSTRUCTIONS
} from '@/mcp-server/mcp-server.constants';

import type { McpServerFactory } from '@/core/mcp/mcp-server-factory';

@Injectable()
export class FeatureMcpServerFactory implements McpServerFactory {
  constructor(
    private readonly orderTools: OrderTools,
    private readonly salesPrompts: SalesPrompts,
    private readonly orderPrompts: OrderPrompts,
    private readonly productTools: ProductTools,
    private readonly customerTools: CustomerTools,
    private readonly orderResources: OrderResources,
    private readonly storeResources: StoreResources,
    private readonly productPrompts: ProductPrompts,
    private readonly inventoryTools: InventoryTools,
    private readonly productResources: ProductResources,
    private readonly inventoryPrompts: InventoryPrompts
  ) {}

  create(): McpServer {
    const server = new McpServer(SERVER_INFO, {
      instructions: SERVER_INSTRUCTIONS,
      capabilities: {
        tools: { listChanged: false },
        prompts: { listChanged: false },
        resources: { subscribe: true, listChanged: false }
      }
    });

    this.productTools.register(server);
    this.orderTools.register(server);
    this.inventoryTools.register(server);
    this.customerTools.register(server);

    this.storeResources.register(server);
    this.productResources.register(server);
    this.orderResources.register(server);

    this.orderPrompts.register(server);
    this.productPrompts.register(server);
    this.inventoryPrompts.register(server);
    this.salesPrompts.register(server);

    return server;
  }
}
