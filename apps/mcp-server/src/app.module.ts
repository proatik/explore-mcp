import { Module } from '@nestjs/common';

import { McpModule } from '@/core/mcp/mcp.module';
import { HealthModule } from '@/core/health/health.module';
import { AppConfigModule } from '@/core/config/config.module';
import { McpServerModule } from '@/mcp-server/mcp-server.module';
import { WooCommerceModule } from '@/core/woocommerce/woocommerce.module';
import { RequestContextMiddleware } from '@/core/logging/request-context.middleware';

import type {
  NestModule,
  DynamicModule,
  MiddlewareConsumer
} from '@nestjs/common';

@Module({})
export class AppModule implements NestModule {
  static forRoot(env: Record<string, unknown>): DynamicModule {
    return {
      module: AppModule,
      imports: [
        McpModule,
        HealthModule,
        McpServerModule,
        WooCommerceModule,
        AppConfigModule.forRoot(env)
      ]
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
