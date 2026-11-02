import {
  Client,
  StreamableHTTPClientTransport
} from '@modelcontextprotocol/client';

import { createMockStore } from 'woo-mock';

import { startServer } from '@/bootstrap/start-server';

import type { MockStore } from 'woo-mock';
import type { RunningServer } from '@/bootstrap/start-server';

export const TOKENS = {
  ops: 'test-ops-token-0123456789',
  readonly: 'test-readonly-token-0123456789'
} as const;

export interface TestStack {
  store: MockStore;
  server: RunningServer;
  close(): Promise<void>;
}

export async function startTestStack(): Promise<TestStack> {
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
    MCP_PORT: '0',
    MCP_RATE_LIMIT_PER_MINUTE: '10000',
    MCP_CLIENTS: JSON.stringify([
      { id: 'ops-agent', token: TOKENS.ops, scopes: ['*'] },
      {
        id: 'readonly-agent',
        token: TOKENS.readonly,
        scopes: ['store:read', 'products:read', 'orders:read', 'inventory:read']
      }
    ]),
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

// the official SDK client, so the server is tested apart from our own client.
export async function connectSdkClient(
  url: string,
  token: string = TOKENS.ops,
  mode: 'auto' | 'legacy' = 'auto'
): Promise<Client> {
  const client = new Client(
    { name: 'test-client', version: '0.0.0' },
    { versionNegotiation: { mode } }
  );
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } }
  });

  await client.connect(transport);

  return client;
}
