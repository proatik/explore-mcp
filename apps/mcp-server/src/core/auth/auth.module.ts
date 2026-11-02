import { Module } from '@nestjs/common';

import { EnvService } from '@/core/config/env.service';
import { BearerAuthGuard } from '@/core/auth/bearer-auth.guard';
import { StaticTokenVerifier } from '@/core/auth/static-token-verifier';

@Module({
  providers: [
    BearerAuthGuard,
    {
      provide: StaticTokenVerifier,
      inject: [EnvService],
      useFactory: (env: EnvService) => new StaticTokenVerifier(env.clients)
    }
  ],
  exports: [BearerAuthGuard, StaticTokenVerifier]
})
export class AuthModule {}
