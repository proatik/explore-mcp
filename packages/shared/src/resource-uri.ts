export function productUri(productId: number): string {
  return `woocommerce://products/${productId}`;
}

export function orderUri(orderId: number): string {
  return `woocommerce://orders/${orderId}`;
}
