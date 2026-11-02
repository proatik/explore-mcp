import { Global, Module } from '@nestjs/common';

import { validateEnv } from '@/core/config/env.schema';
import { EnvService } from '@/core/config/env.service';

import type { DynamicModule } from '@nestjs/common';

@Global()
@Module({})
export class AppConfigModule {
  static forRoot(env: Record<string, unknown>): DynamicModule {
    return {
      module: AppConfigModule,
      providers: [
        { provide: EnvService, useValue: new EnvService(validateEnv(env)) }
      ],
      exports: [EnvService]
    };
  }
}
