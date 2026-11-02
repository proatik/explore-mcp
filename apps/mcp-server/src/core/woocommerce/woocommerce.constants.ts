export const WOOCOMMERCE_API_PATH = '/wp-json/wc/v3';

export const WOOCOMMERCE_SITE_PATH = '/wp-json';

export const MAX_RETRY_AFTER_MS = 5_000;

export const DEFAULT_RETRY_BASE_DELAY_MS = 200;

/**
 * 'MAX_RETRY_AFTER_MS' caps a store's Retry-After so one call cannot stall.
 */
