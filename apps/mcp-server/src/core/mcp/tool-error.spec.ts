import { it, expect, describe } from 'vitest';

import { ToolError } from '@/core/mcp/tool-error';
import { WooCommerceApiError } from '@/core/woocommerce/woocommerce-api-error';

describe('ToolError.fromWooCommerce', () => {
  it('hides upstream credential failures behind a generic message', () => {
    const error = ToolError.fromWooCommerce(
      new WooCommerceApiError('unauthorized', 'Consumer key is invalid', {
        status: 401
      })
    );

    expect(error.code).toBe('UPSTREAM_ERROR');
    expect(error.message).not.toMatch(/consumer key/i);
  });

  it('marks outages as retryable', () => {
    const error = ToolError.fromWooCommerce(
      new WooCommerceApiError('timeout', 'slow')
    );

    expect(error).toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
      isRetryable: true
    });
  });

  it('names the missing record', () => {
    const error = ToolError.fromWooCommerce(
      new WooCommerceApiError('not_found', 'Invalid ID.'),
      'order'
    );

    expect(error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'The requested order does not exist.'
    });
  });
});
