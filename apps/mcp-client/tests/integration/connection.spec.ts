import { createServer } from 'node:http';

import { it, expect, describe, afterAll, beforeAll } from 'vitest';

import { classifyError } from '@/core/error/classify-error';
import { TOKENS, startTestStack } from '../support/test-stack';
import { McpConnection } from '@/modules/connection/mcp-connection';
import { discoverServer } from '@/modules/discovery/discover-server';
import { ServerRegistry } from '@/modules/connection/server-registry';
import {
  complete,
  getPrompt,
  readResource,
  subscribeResources
} from '@/modules/operation/mcp-operations';

import type { AddressInfo } from 'node:net';
import type { TestStack } from '../support/test-stack';
import type {
  ConnectionState,
  ConnectionOptions
} from '@/modules/connection/mcp-connection';

let stack: TestStack;

beforeAll(async () => {
  stack = await startTestStack();
});

afterAll(async () => {
  await stack.close();
});

function connection(overrides: Partial<ConnectionOptions> = {}): McpConnection {
  return new McpConnection({
    name: 'woocommerce',
    url: stack.server.mcpUrl,
    token: TOKENS.ops,
    retryBaseDelayMs: 10,
    ...overrides
  });
}

async function freePort(): Promise<number> {
  const probe = createServer();

  await new Promise<void>((resolve) => {
    probe.listen(0, '127.0.0.1', resolve);
  });

  const { port } = probe.address() as AddressInfo;

  await new Promise((resolve) => probe.close(resolve));

  return port;
}

function firstText(contents: Array<{ uri: string }>): string {
  const first = contents[0];

  return first && 'text' in first && typeof first.text === 'string'
    ? first.text
    : '';
}

describe('McpConnection', () => {
  it('connects, negotiates and reports server info', async () => {
    const states: ConnectionState[] = [];
    const conn = connection({ onStateChange: (state) => states.push(state) });

    await conn.connect();

    expect(conn.info()).toMatchObject({
      name: 'woocommerce-mcp',
      protocolVersion: '2026-07-28',
      era: 'modern'
    });

    await conn.close();

    expect(states).toEqual(['connecting', 'connected', 'closed']);
  });

  it('fails fast on bad credentials instead of retrying', async () => {
    const retries: string[] = [];
    const conn = connection({
      token: 'bad-token-000000000000',
      onStateChange: (_state, detail) =>
        detail?.includes('retrying') && retries.push(detail)
    });

    const error = await conn.connect().catch((failure: unknown) => failure);

    expect(classifyError(error)).toBe('auth');
    expect(retries).toEqual([]);
  });

  it('retries with backoff, then gives up, when the server is unreachable', async () => {
    const retries: string[] = [];
    const conn = connection({
      url: `http://127.0.0.1:${await freePort()}/mcp`,
      maxConnectAttempts: 3,
      onStateChange: (_state, detail) =>
        detail?.includes('retrying') && retries.push(detail)
    });

    const error = await conn.connect().catch((failure: unknown) => failure);

    expect(classifyError(error)).toBe('transient');
    expect(retries).toHaveLength(2);
  });

  it('reconnects transparently for reads after the server restarts', async () => {
    const port = await freePort();
    let local = await startTestStack({ port });
    const conn = connection({ url: local.server.mcpUrl });

    try {
      await discoverServer(conn);

      await local.close();

      local = await startTestStack({ port });

      const result = await readResource(conn, 'woocommerce://store/info');

      expect(result.contents).toHaveLength(1);
    } finally {
      await conn.close();

      await local.close();
    }
  });
});

describe('discovery and operations', () => {
  it('discovers the full catalog without hardcoded knowledge of the server', async () => {
    const conn = connection();

    try {
      const catalog = await discoverServer(conn);

      expect(catalog.tools).toHaveLength(12);
      expect(catalog.resourceTemplates).toHaveLength(2);
      expect(catalog.prompts).toHaveLength(5);
      expect(catalog.resources.length).toBeGreaterThanOrEqual(3);
    } finally {
      await conn.close();
    }
  });

  it('reads resources, gets prompts and completes arguments', async () => {
    const conn = connection();

    try {
      const product = await readResource(conn, 'woocommerce://products/101');
      const prompt = await getPrompt(conn, 'analyze_inventory', {
        threshold: '3'
      });
      const completion = await complete(
        conn,
        { type: 'ref/resource', uri: 'woocommerce://products/{productId}' },
        { name: 'productId', value: '11' }
      );

      expect(JSON.parse(firstText(product.contents))).toMatchObject({
        sku: 'KIT-POUR-01'
      });
      expect(prompt.messages).toHaveLength(2);
      expect(completion.completion.values).toEqual([
        '110',
        '111',
        '112',
        '113'
      ]);
    } finally {
      await conn.close();
    }
  });

  it('delivers resource update notifications to subscribers', async () => {
    const watcher = connection();
    const writer = connection();
    const updates: string[] = [];

    try {
      const subscription = await subscribeResources(
        watcher,
        ['woocommerce://orders/5006'],
        (uri) => updates.push(uri)
      );

      expect(subscription.uris).toEqual(['woocommerce://orders/5006']);

      await writer.use(
        async (client) =>
          await client.callTool({
            name: 'add_order_note',
            arguments: { orderId: 5006, note: 'Called the customer.' }
          })
      );

      await expect.poll(() => updates).toEqual(['woocommerce://orders/5006']);

      await subscription.close();

      expect(await subscription.closed).toBe('local');
    } finally {
      await watcher.close();

      await writer.close();
    }
  });
});

describe('ServerRegistry', () => {
  it('namespaces tools across several servers and routes calls to the right one', async () => {
    const second = await startTestStack();
    const registry = new ServerRegistry().add(connection({ name: 'eu' })).add(
      new McpConnection({
        name: 'us',
        url: second.server.mcpUrl,
        token: TOKENS.ops
      })
    );

    try {
      const { failures } = await registry.refresh();
      const names = registry.tools().map((entry) => entry.qualifiedName);

      expect(failures).toEqual([]);
      expect(names).toEqual(
        expect.arrayContaining(['eu__list_products', 'us__list_products'])
      );

      await registry.callTool('us__update_stock_quantity', {
        productId: 101,
        operation: 'set',
        quantity: 1,
        reason: 'us count'
      });

      expect(
        second.store.state.products.find((product) => product.id === 101)
          ?.stock_quantity
      ).toBe(1);
      expect(
        stack.store.state.products.find((product) => product.id === 101)
          ?.stock_quantity
      ).toBe(14);
    } finally {
      await registry.closeAll();

      await second.close();
    }
  });

  it('keeps working when one server is down', async () => {
    const registry = new ServerRegistry().add(connection({ name: 'up' })).add(
      new McpConnection({
        name: 'down',
        url: `http://127.0.0.1:${await freePort()}/mcp`,
        maxConnectAttempts: 1
      })
    );

    try {
      const { catalogs, failures } = await registry.refresh();

      expect(catalogs.map((catalog) => catalog.server)).toEqual(['up']);
      expect(failures.map((failure) => failure.server)).toEqual(['down']);
      expect(registry.tools().every((entry) => entry.server === 'up')).toBe(
        true
      );
    } finally {
      await registry.closeAll();
    }
  });
});
