export const MAX_SUMMARY_PAGES = 10;

export const SUMMARY_PAGE_SIZE = 100;

export const TOP_PRODUCT_COUNT = 5;

export const REVENUE_STATUSES: readonly string[] = ['processing', 'completed'];

/**
 * 1. 'MAX_SUMMARY_PAGES' bounds one summary at 1,000 orders.
 * 2. 'REVENUE_STATUSES' are the statuses where the money was actually taken.
 */
