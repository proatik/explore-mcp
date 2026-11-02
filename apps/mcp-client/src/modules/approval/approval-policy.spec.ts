import { it, expect, describe } from 'vitest';

import { ApprovalPolicy } from '@/modules/approval/approval-policy';

import type { ToolAnnotations } from '@modelcontextprotocol/client';

const policy = new ApprovalPolicy();

function evaluate(
  tool: string,
  args: Record<string, unknown> = {},
  annotations?: ToolAnnotations
) {
  return policy.evaluate({ server: 'woocommerce', tool, args, annotations });
}

describe('ApprovalPolicy', () => {
  it('runs reads automatically', () => {
    for (const tool of [
      'list_products',
      'get_order',
      'get_stock_status',
      'list_customers'
    ]) {
      expect(evaluate(tool)).toBe('auto');
    }
  });

  it('asks before writes', () => {
    expect(evaluate('update_stock_quantity')).toBe('confirm');
    expect(evaluate('update_order_status')).toBe('confirm');
  });

  it('requires explicit approval for destructive or irreversible actions', () => {
    expect(evaluate('delete_product')).toBe('explicit');
    expect(evaluate('add_order_note', { customerVisible: false })).toBe(
      'confirm'
    );
    expect(evaluate('add_order_note', { customerVisible: true })).toBe(
      'explicit'
    );
  });

  it('never lets a server talk an unknown tool into running automatically', () => {
    expect(evaluate('wipe_cache', {}, { readOnlyHint: true })).toBe('confirm');
    expect(evaluate('drop_everything', {}, { destructiveHint: true })).toBe(
      'explicit'
    );
  });

  it('supports server-specific overrides', () => {
    const custom = new ApprovalPolicy({ 'crm/search': 'auto', search: 'deny' });

    expect(custom.evaluate({ server: 'crm', tool: 'search', args: {} })).toBe(
      'auto'
    );
    expect(custom.evaluate({ server: 'other', tool: 'search', args: {} })).toBe(
      'deny'
    );
  });
});
