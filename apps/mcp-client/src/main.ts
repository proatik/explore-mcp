import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

import { createLogger } from '@woocommerce-mcp/shared';

import { startClient } from '@/bootstrap/start-client';

// the repository root .env; absent inside docker, where env comes from compose.
const ENV_FILE = resolve(__dirname, '../../../.env');

const logger = createLogger('main');

async function bootstrap(): Promise<void> {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

  const client = await startClient(process.env);

  logger.log('woocommerce agent listening', {
    url: client.url,
    servers: client.env.servers.map((server) => server.name)
  });
}

bootstrap().catch((error: unknown) => {
  logger.error('client failed to start', error);

  process.exitCode = 1;
});
