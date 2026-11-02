export const SERVER_INFO = {
  name: 'woocommerce-mcp',
  version: '0.1.0'
} as const;

export const SERVER_INSTRUCTIONS = [
  'This server connects to a WooCommerce store, which is the source of truth for products, orders, customers and stock.',
  '- Read tools are safe to call freely. Write tools (update_stock_quantity, update_order_status, add_order_note, delete_product) change the live store; confirm intent with the user first.',
  '- Results are paginated; check totalPages before concluding that something does not exist.',
  '- Customer contact details are masked by design.',
  '- A tool result with isError=true carries an error code (for example NOT_FOUND, FORBIDDEN, INVALID_TRANSITION, CONFLICT). Explain it to the user rather than retrying blindly; retry only when retryable is true.'
].join('\n');
