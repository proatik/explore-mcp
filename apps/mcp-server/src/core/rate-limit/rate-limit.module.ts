import { Module } from '@nestjs/common';

import { EnvService } from '@/core/config/env.service';
import { RateLimitGuard } from '@/core/rate-limit/rate-limit.guard';
import { RateLimiter } from '@/core/rate-limit/rate-limiter.service';

@Module({
  providers: [
    RateLimitGuard,
    {
      provide: RateLimiter,
      inject: [EnvService],
      useFactory: (env: EnvService) => new RateLimiter(env.rateLimitPerMinute)
    }
  ],
  exports: [RateLimitGuard, RateLimiter]
})
export class RateLimitModule {}
