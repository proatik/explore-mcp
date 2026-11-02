import { vi, it, expect, describe } from 'vitest';

import { WooCommerceClient } from '@/core/woocommerce/woocommerce-client';
import { WooCommerceApiError } from '@/core/woocommerce/woocommerce-api-error';

import type { WooCommerceClientOptions } from '@/core/woocommerce/woocommerce-client';

function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers }
  });
}

const hang: typeof fetch = async (_url, init) =>
  await new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(init.signal?.reason as Error);
    });
  });

function createClient(
  fetchImpl: typeof fetch,
  overrides: Partial<WooCommerceClientOptions> = {}
): WooCommerceClient {
  return new WooCommerceClient({
    baseUrl: 'https://store.example',
    consumerKey: 'ck_123',
    consumerSecret: 'cs_456',
    timeoutMs: 1_000,
    maxRetries: 2,
    retryBaseDelayMs: 1,
    fetch: fetchImpl,
    ...overrides
  });
}

describe('WooCommerceClient', () => {
  it('sends basic auth to the wc/v3 namespace and reads pagination headers', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      json(200, [{ id: 1 }], { 'x-wp-total': '31', 'x-wp-totalpages': '4' })
    );

    const response = await createClient(fetchMock).get('products', {
      query: { page: 2, per_page: 10, search: undefined }
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const headers = init?.headers as Record<string, string>;

    expect(String(url)).toBe(
      'https://store.example/wp-json/wc/v3/products?page=2&per_page=10'
    );
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from('ck_123:cs_456').toString('base64')}`
    );
    expect(response).toEqual({ data: [{ id: 1 }], total: 31, totalPages: 4 });
  });

  it('retries reads on 503 and succeeds', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(503, { code: 'down', message: 'Down' }))
      .mockResolvedValueOnce(json(200, { id: 7 }));

    await expect(
      createClient(fetchMock).get('products/7')
    ).resolves.toMatchObject({ data: { id: 7 } });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after maxRetries with a retryable error', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      json(429, { code: 'too_many', message: 'Slow down' })
    );

    const error = await createClient(fetchMock)
      .get('orders')
      .catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(WooCommerceApiError);
    expect(error).toMatchObject({ kind: 'rate_limited', isRetryable: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('never retries writes, because the first attempt may have landed', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      json(503, { message: 'Down' })
    );

    await expect(
      createClient(fetchMock).put('products/1', { body: { stock_quantity: 4 } })
    ).rejects.toMatchObject({
      kind: 'unavailable'
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps 404 to not_found without retrying', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      json(404, {
        code: 'woocommerce_rest_product_invalid_id',
        message: 'Invalid ID.'
      })
    );

    const error = await createClient(fetchMock)
      .get('products/999')
      .catch((failure: unknown) => failure);

    expect(error).toMatchObject({
      kind: 'not_found',
      status: 404,
      wooCode: 'woocommerce_rest_product_invalid_id'
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('turns a hung request into a timeout', async () => {
    const error = await createClient(hang, { timeoutMs: 20, maxRetries: 0 })
      .get('products')
      .catch((failure: unknown) => failure);

    expect(error).toMatchObject({ kind: 'timeout', isRetryable: true });
  });

  it('reports caller cancellation as cancelled, not as a timeout', async () => {
    const controller = new AbortController();
    const pending = createClient(hang).get('products', {
      signal: controller.signal
    });

    controller.abort();

    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' });
  });
});
