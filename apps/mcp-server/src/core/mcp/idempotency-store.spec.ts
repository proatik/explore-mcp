import { vi, it, expect, describe } from 'vitest';

import { IdempotencyStore } from '@/core/mcp/idempotency-store';

import type { CallToolResult } from '@modelcontextprotocol/server';

const okResult = (value: number): CallToolResult => ({
  content: [{ type: 'text', text: String(value) }]
});
const scope = (key?: string) => ({
  clientId: 'c1',
  tool: 'update_stock_quantity',
  key
});

describe('IdempotencyStore', () => {
  it('replays the first result for a repeated key and arguments', async () => {
    const store = new IdempotencyStore();
    const run = vi.fn(async () => okResult(1));

    await store.run(scope('key-00001'), { quantity: 1 }, run);

    const second = await store.run(scope('key-00001'), { quantity: 1 }, run);

    expect(run).toHaveBeenCalledTimes(1);
    expect(second._meta).toMatchObject({ idempotentReplay: true });
  });

  it('rejects a reused key with different arguments', async () => {
    const store = new IdempotencyStore();

    await store.run(scope('key-00001'), { quantity: 1 }, async () =>
      okResult(1)
    );

    await expect(
      store.run(scope('key-00001'), { quantity: 2 }, async () => okResult(2))
    ).rejects.toMatchObject({
      code: 'CONFLICT'
    });
  });

  it('forgets failures, so a corrected retry can run', async () => {
    const store = new IdempotencyStore();
    const run = vi.fn(async () => okResult(1));

    await store.run(scope('key-00001'), { quantity: 1 }, async () => ({
      ...okResult(0),
      isError: true
    }));

    await store.run(scope('key-00001'), { quantity: 1 }, run);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('forgets keys after the time to live', async () => {
    let now = 0;
    const store = new IdempotencyStore(1_000, () => now);
    const run = vi.fn(async () => okResult(1));

    await store.run(scope('key-00001'), {}, run);

    now = 1_001;

    await store.run(scope('key-00001'), {}, run);

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('runs every call when no key is given', async () => {
    const store = new IdempotencyStore();
    const run = vi.fn(async () => okResult(1));

    await store.run(scope(), {}, run);

    await store.run(scope(), {}, run);

    expect(run).toHaveBeenCalledTimes(2);
  });
});
