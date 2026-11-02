import { NestFactory } from '@nestjs/core';

import { AppModule } from '@/app.module';
import { FaultService } from '@/core/fault/fault.service';
import { StoreCatalog } from '@/modules/catalog/store-catalog.service';
import { WooCommerceErrorFilter } from '@/core/http/woocommerce-error.filter';
import { DEFAULT_MOCK_STORE_OPTIONS } from '@/core/config/mock-store-options';

import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { SeedData } from '@/modules/catalog/woocommerce.types';
import type { Fault, RecordedRequest } from '@/core/fault/fault.service';
import type { MockStoreOptions } from '@/core/config/mock-store-options';

export interface MockStore {
  url: string;
  state: SeedData;
  requests: RecordedRequest[];
  injectFault(fault: Fault): void;
  reset(): void;
  close(): Promise<void>;
}

export async function createMockStore(
  overrides: Partial<MockStoreOptions> = {}
): Promise<MockStore> {
  const options = { ...DEFAULT_MOCK_STORE_OPTIONS, ...overrides };
  const app = await NestFactory.create(AppModule.forRoot(options), {
    logger: ['error', 'warn']
  });

  app.useGlobalFilters(new WooCommerceErrorFilter());

  await app.listen(options.port, options.host);

  const server = app.getHttpServer() as Server;
  const { port } = server.address() as AddressInfo;
  const catalog = app.get(StoreCatalog);
  const faults = app.get(FaultService);

  return {
    url: `http://${options.host}:${port}`,
    get state() {
      return catalog.data;
    },
    requests: faults.requests,
    injectFault: (fault) => {
      faults.inject(fault);
    },
    reset: () => {
      catalog.reset();
      faults.reset();
    },
    close: async () => {
      faults.releaseHanging();
      server.closeAllConnections();

      await app.close();
    }
  };
}
