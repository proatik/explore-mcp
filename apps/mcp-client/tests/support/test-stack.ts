import { startServer } from 'mcp-server';
import { createMockStore } from 'woo-mock';

import type { MockStore } from 'woo-mock';
import type { RunningServer } from 'mcp-server';

export const TOKENS = {
  ops: 'test-ops-token-0123456789',
  readonly: 'test-readonly-token-0123456789'
} as const;

export interface TestStack {
  store: MockStore;
  server: RunningServer;
  close(): Promise<void>;
}

export async function startTestStack(
  options: { port?: number } = {}
): Promise<TestStack> {
  const store = await createMockStore({
    consumerKey: 'ck_test',
    consumerSecret: 'cs_test'
  });
  const env = {
    WOO_BASE_URL: store.url,
    WOO_CONSUMER_KEY: 'ck_test',
    WOO_CONSUMER_SECRET: 'cs_test',
    WOO_TIMEOUT_MS: '2000',
    WOO_RETRY_BASE_DELAY_MS: '5',
    MCP_PORT: String(options.port ?? 0),
    MCP_RATE_LIMIT_PER_MINUTE: '10000',
    MCP_CLIENT_TOKEN: TOKENS.ops,
    LOG_LEVEL: 'silent'
  };

  const server = await startServer(env);

  return {
    store,
    server,
    close: async () => {
      await server.close();

      await store.close();
    }
  };
}
