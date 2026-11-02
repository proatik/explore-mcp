export const MAX_STOCK_DELTA = 1_000;

export const MAX_STOCK_QUANTITY = 100_000;

export const SCAN_PAGE_SIZE = 50;

export const SCAN_MAX_PAGES = 40;

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

/**
 * 1. 'MAX_STOCK_DELTA' stops one mistyped call from wiping out or inflating stock.
 * 2. 'SCAN_MAX_PAGES' bounds a catalog scan at 2,000 products per call.
 */
