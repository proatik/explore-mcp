import { Global, Module } from '@nestjs/common';

import { FaultService } from '@/core/fault/fault.service';
import { MOCK_STORE_OPTIONS } from '@/core/config/mock-store-options';

import type { DynamicModule } from '@nestjs/common';
import type { MockStoreOptions } from '@/core/config/mock-store-options';

@Global()
@Module({})
export class MockConfigModule {
  static forRoot(options: MockStoreOptions): DynamicModule {
    return {
      module: MockConfigModule,
      providers: [
        { provide: MOCK_STORE_OPTIONS, useValue: options },
        FaultService
      ],
      exports: [MOCK_STORE_OPTIONS, FaultService]
    };
  }
}
