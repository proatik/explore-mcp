import { it, expect, describe } from 'vitest';

import { ChangeEvents } from '@/core/mcp/change-events';
import { OrderService } from '@/modules/order/order.service';
import { WooCommerceClient } from '@/core/woocommerce/woocommerce-client';

const orders = new OrderService(
  new ChangeEvents(),
  new WooCommerceClient({
    baseUrl: 'https://store.example',
    consumerKey: 'ck',
    consumerSecret: 'cs',
    timeoutMs: 1_000,
    maxRetries: 0
  })
);

describe('OrderService.canTransition', () => {
  it.each([
    ['pending', 'processing'],
    ['processing', 'completed'],
    ['on-hold', 'processing'],
    ['failed', 'pending']
  ] as const)('allows %s to %s', (from, to) => {
    expect(orders.canTransition(from, to)).toBe(true);
  });

  it.each([
    ['completed', 'processing'],
    ['cancelled', 'pending'],
    ['refunded', 'completed'],
    ['processing', 'refunded'],
    ['processing', 'pending'],
    ['unknown-status', 'processing']
  ] as const)('blocks %s to %s', (from, to) => {
    expect(orders.canTransition(from, to)).toBe(false);
  });
});
