import { Global, Module } from '@nestjs/common';

import { StoreModule } from '@/modules/store/store.module';
import { OrderModule } from '@/modules/order/order.module';
import { SalesModule } from '@/modules/sales/sales.module';
import { ProductModule } from '@/modules/product/product.module';
import { MCP_SERVER_FACTORY } from '@/core/mcp/mcp-server-factory';
import { CustomerModule } from '@/modules/customer/customer.module';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { FeatureMcpServerFactory } from '@/mcp-server/mcp-server.factory';

@Global()
@Module({
  imports: [
    StoreModule,
    OrderModule,
    SalesModule,
    ProductModule,
    CustomerModule,
    InventoryModule
  ],
  providers: [
    { provide: MCP_SERVER_FACTORY, useClass: FeatureMcpServerFactory }
  ],
  exports: [MCP_SERVER_FACTORY]
})
export class McpServerModule {}
