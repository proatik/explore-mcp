import type { OrderStatus } from '@woocommerce-mcp/shared';

export const RECENT_ORDER_LIMIT = 50;

export const ORDER_STATUS_TRANSITIONS: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  pending: ['processing', 'on-hold', 'cancelled', 'failed'],
  processing: ['completed', 'on-hold', 'cancelled'],
  'on-hold': ['processing', 'pending', 'cancelled'],
  failed: ['pending', 'processing', 'cancelled'],
  completed: [],
  cancelled: [],
  refunded: []
};

/**
 * 'ORDER_STATUS_TRANSITIONS' is stricter than woocommerce on purpose.
 *   completed, cancelled and refunded orders are final for an AI client.
 *   refunded is never a target: a refund needs an amount and a gateway.
 */
