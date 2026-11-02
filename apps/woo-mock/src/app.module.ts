import { Module } from '@nestjs/common';

import { SiteModule } from '@/modules/site/site.module';
import { OrderModule } from '@/modules/order/order.module';
import { ProductModule } from '@/modules/product/product.module';
import { MockConfigModule } from '@/core/config/mock-config.module';
import { CustomerModule } from '@/modules/customer/customer.module';
import { FaultInjectionMiddleware } from '@/core/fault/fault-injection.middleware';

import type { MockStoreOptions } from '@/core/config/mock-store-options';
import type {
  NestModule,
  DynamicModule,
  MiddlewareConsumer
} from '@nestjs/common';

@Module({})
export class AppModule implements NestModule {
  static forRoot(options: MockStoreOptions): DynamicModule {
    return {
      module: AppModule,
      imports: [
        SiteModule,
        OrderModule,
        ProductModule,
        CustomerModule,
        MockConfigModule.forRoot(options)
      ]
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(FaultInjectionMiddleware).forRoutes('*');
  }
}
