import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

import { createMockStore } from '@/bootstrap/create-mock-store';
import { loadMockStoreOptions } from '@/core/config/mock-store-options';

// the repository root .env; absent inside docker, where env comes from compose.
const ENV_FILE = resolve(__dirname, '../../../.env');

async function bootstrap(): Promise<void> {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

  const store = await createMockStore(loadMockStoreOptions(process.env));

  console.log(
    `[woo-mock] WooCommerce REST API mock listening on ${store.url}/wp-json/wc/v3`
  );

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void store.close().then(() => process.exit(0));
    });
  }
}

void bootstrap();
