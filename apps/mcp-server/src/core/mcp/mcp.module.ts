import { Global, Module } from '@nestjs/common';

import { AuthModule } from '@/core/auth/auth.module';
import { ChangeEvents } from '@/core/mcp/change-events';
import { McpController } from '@/core/mcp/mcp.controller';
import { IdempotencyStore } from '@/core/mcp/idempotency-store';
import { McpHandlerService } from '@/core/mcp/mcp-handler.service';
import { RateLimitModule } from '@/core/rate-limit/rate-limit.module';
import { HostOriginMiddleware } from '@/core/http/host-origin.middleware';

import type { NestModule, MiddlewareConsumer } from '@nestjs/common';

@Global()
@Module({
  imports: [AuthModule, RateLimitModule],
  controllers: [McpController],
  providers: [
    ChangeEvents,
    McpHandlerService,
    { provide: IdempotencyStore, useFactory: () => new IdempotencyStore() }
  ],
  exports: [ChangeEvents, IdempotencyStore]
})
export class McpModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HostOriginMiddleware).forRoutes('mcp');
  }
}
