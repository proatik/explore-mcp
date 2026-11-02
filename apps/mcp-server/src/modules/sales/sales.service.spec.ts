import { it, expect, describe } from 'vitest';

import { ChangeEvents } from '@/core/mcp/change-events';
import { SalesService } from '@/modules/sales/sales.service';
import { OrderService } from '@/modules/order/order.service';
import { WooCommerceClient } from '@/core/woocommerce/woocommerce-client';

import type { OrderSummary } from '@woocommerce-mcp/shared';

type LineItemSeed = [
  productId: number,
  name: string,
  quantity: number,
  total: string
];

const sales = new SalesService(
  new OrderService(
    new ChangeEvents(),
    new WooCommerceClient({
      baseUrl: 'https://store.example',
      consumerKey: 'ck',
      consumerSecret: 'cs',
      timeoutMs: 1_000,
      maxRetries: 0
    })
  )
);

function order(
  id: number,
  status: string,
  total: string,
  items: LineItemSeed[]
): OrderSummary {
  return {
    id,
    number: String(id),
    status,
    currency: 'EUR',
    total,
    dateCreated: '2026-10-01T00:00:00',
    customer: { id: 1, name: 'A B.', emailMasked: '', city: '', country: '' },
    lineItems: items.map(([productId, name, quantity, lineTotal]) => ({
      productId,
      name,
      quantity,
      total: lineTotal
    })),
    paymentMethod: 'card'
  };
}

describe('SalesService.summarize', () => {
  it('counts revenue only for processing and completed orders', () => {
    const summary = sales.summarize(
      [
        order(1, 'completed', '30.00', [[10, 'Mug', 2, '30.00']]),
        order(2, 'processing', '20.00', [[11, 'Towel', 1, '20.00']]),
        order(3, 'cancelled', '99.00', [[10, 'Mug', 9, '99.00']])
      ],
      30
    );

    expect(summary).toMatchObject({
      orderCount: 3,
      revenueOrderCount: 2,
      revenue: '50.00',
      averageOrderValue: '25.00',
      ordersByStatus: { completed: 1, processing: 1, cancelled: 1 }
    });
    expect(summary.topProducts[0]).toEqual({
      productId: 10,
      name: 'Mug',
      quantity: 2,
      revenue: '30.00'
    });
  });

  it('handles an empty period', () => {
    expect(sales.summarize([], 7)).toMatchObject({
      orderCount: 0,
      revenue: '0.00',
      averageOrderValue: '0.00',
      topProducts: []
    });
  });
});
