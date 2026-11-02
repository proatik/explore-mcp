import type { ApprovalRule } from '@/modules/approval/approval.types';

export const DEFAULT_APPROVAL_RULES: Record<string, ApprovalRule> = {
  list_products: 'auto',
  get_product: 'auto',
  search_products: 'auto',
  list_orders: 'auto',
  get_order: 'auto',
  get_stock_status: 'auto',
  list_customers: 'auto',
  get_customer: 'auto',
  update_stock_quantity: 'confirm',
  update_order_status: 'confirm',
  add_order_note: (args) =>
    args.customerVisible === true ? 'explicit' : 'confirm',
  delete_product: 'explicit'
};

/**
 * 'DEFAULT_APPROVAL_RULES' marks a customer-visible note explicit: it emails.
 */
