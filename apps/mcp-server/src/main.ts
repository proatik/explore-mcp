import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

import { createLogger } from '@woocommerce-mcp/shared';

import { startServer } from '@/bootstrap/start-server';

// the repository root .env; absent inside docker, where env comes from compose.
const ENV_FILE = resolve(__dirname, '../../../.env');

const logger = createLogger('main');

async function bootstrap(): Promise<void> {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

  const server = await startServer(process.env);

  logger.log('woocommerce mcp server listening', {
    mcpUrl: server.mcpUrl,
    store: server.env.storeUrl,
    clients: server.env.clients.map((client) => client.id)
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      logger.log('shutting down', { signal });

      void server.close().then(() => process.exit(0));
    });
  }
}

bootstrap().catch((error: unknown) => {
  logger.error('server failed to start', error);

  process.exitCode = 1;
});
