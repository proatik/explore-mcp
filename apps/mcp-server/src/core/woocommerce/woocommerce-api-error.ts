export type WooCommerceErrorKind =
  | 'not_found'
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'unavailable'
  | 'timeout'
  | 'cancelled'
  | 'upstream';

export interface WooCommerceErrorDetails {
  status?: number;
  wooCode?: string;
  retryAfterMs?: number;
}

const RETRYABLE_KINDS: readonly WooCommerceErrorKind[] = [
  'rate_limited',
  'unavailable',
  'timeout'
];

export class WooCommerceApiError extends Error {
  readonly kind: WooCommerceErrorKind;
  readonly status: number | undefined;
  readonly wooCode: string | undefined;
  readonly retryAfterMs: number | undefined;

  constructor(
    kind: WooCommerceErrorKind,
    message: string,
    details: WooCommerceErrorDetails = {}
  ) {
    super(message);

    this.name = 'WooCommerceApiError';
    this.kind = kind;
    this.status = details.status;
    this.wooCode = details.wooCode;
    this.retryAfterMs = details.retryAfterMs;
  }

  get isRetryable(): boolean {
    return RETRYABLE_KINDS.includes(this.kind);
  }
}
