import { Global, Module } from '@nestjs/common';

import { EnvService } from '@/core/config/env.service';
import { WooCommerceClient } from '@/core/woocommerce/woocommerce-client';

@Global()
@Module({
  providers: [
    {
      provide: WooCommerceClient,
      inject: [EnvService],
      useFactory: (env: EnvService) => new WooCommerceClient(env.woocommerce)
    }
  ],
  exports: [WooCommerceClient]
})
export class WooCommerceModule {}
