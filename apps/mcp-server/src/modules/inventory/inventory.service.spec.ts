import { it, expect, describe } from 'vitest';

import { ToolError } from '@/core/mcp/tool-error';
import { ChangeEvents } from '@/core/mcp/change-events';
import { ProductService } from '@/modules/product/product.service';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { MAX_STOCK_DELTA } from '@/modules/inventory/inventory.constants';
import { WooCommerceClient } from '@/core/woocommerce/woocommerce-client';

const woocommerce = new WooCommerceClient({
  baseUrl: 'https://store.example',
  consumerKey: 'ck',
  consumerSecret: 'cs',
  timeoutMs: 1_000,
  maxRetries: 0
});

const inventory = new InventoryService(
  new ProductService(new ChangeEvents(), woocommerce)
);

const managed = (stockQuantity: number) => ({
  manageStock: true,
  stockQuantity
});

function errorOf(run: () => unknown): ToolError {
  try {
    run();
  } catch (error) {
    if (error instanceof ToolError) return error;

    throw error;
  }

  throw new Error('Expected a ToolError.');
}

describe('InventoryService.computeNewQuantity', () => {
  it('applies set, increment and decrement', () => {
    expect(
      inventory.computeNewQuantity(managed(10), {
        operation: 'set',
        quantity: 3
      })
    ).toBe(3);
    expect(
      inventory.computeNewQuantity(managed(10), {
        operation: 'increment',
        quantity: 5
      })
    ).toBe(15);
    expect(
      inventory.computeNewQuantity(managed(10), {
        operation: 'decrement',
        quantity: 10
      })
    ).toBe(0);
  });

  it('refuses products that do not track stock', () => {
    const error = errorOf(() =>
      inventory.computeNewQuantity(
        { manageStock: false, stockQuantity: null },
        { operation: 'set', quantity: 1 }
      )
    );

    expect(error.code).toBe('VALIDATION_FAILED');
  });

  it('never lets stock go negative', () => {
    const error = errorOf(() =>
      inventory.computeNewQuantity(managed(2), {
        operation: 'decrement',
        quantity: 3
      })
    );

    expect(error.code).toBe('VALIDATION_FAILED');
  });

  it('caps the size of a single change', () => {
    expect(() =>
      inventory.computeNewQuantity(managed(0), {
        operation: 'increment',
        quantity: MAX_STOCK_DELTA
      })
    ).not.toThrow();

    const error = errorOf(() =>
      inventory.computeNewQuantity(managed(0), {
        operation: 'set',
        quantity: MAX_STOCK_DELTA + 1
      })
    );

    expect(error.message).toMatch(/at most/);
  });

  it('rejects a stale expectedCurrentQuantity as a conflict', () => {
    const error = errorOf(() =>
      inventory.computeNewQuantity(managed(7), {
        operation: 'set',
        quantity: 5,
        expectedCurrentQuantity: 6
      })
    );

    expect(error.code).toBe('CONFLICT');
    expect(error.details).toEqual({ expected: 6, actual: 7 });
  });
});
