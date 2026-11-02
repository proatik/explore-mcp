import { WooCommerceApiError } from '@/core/woocommerce/woocommerce-api-error';

import type { ToolErrorCode } from '@woocommerce-mcp/shared';

const RETRYABLE_CODES: readonly ToolErrorCode[] = [
  'RATE_LIMITED',
  'UPSTREAM_UNAVAILABLE'
];

// a business failure: the call was valid, the operation could not happen.
export class ToolError extends Error {
  readonly code: ToolErrorCode;
  readonly isRetryable: boolean;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    code: ToolErrorCode,
    message: string,
    options: { isRetryable?: boolean; details?: Record<string, unknown> } = {}
  ) {
    super(message);

    this.name = 'ToolError';
    this.code = code;
    this.isRetryable = options.isRetryable ?? RETRYABLE_CODES.includes(code);
    this.details = options.details;
  }

  static fromWooCommerce(
    error: WooCommerceApiError,
    subject = 'resource'
  ): ToolError {
    switch (error.kind) {
      case 'not_found':
        return new ToolError(
          'NOT_FOUND',
          `The requested ${subject} does not exist.`
        );
      case 'bad_request':
        return new ToolError(
          'VALIDATION_FAILED',
          `WooCommerce rejected the request: ${error.message}`
        );
      case 'rate_limited':
        return new ToolError(
          'RATE_LIMITED',
          'WooCommerce is rate limiting requests. Try again shortly.'
        );
      case 'unavailable':
      case 'timeout':
        return new ToolError(
          'UPSTREAM_UNAVAILABLE',
          'WooCommerce is temporarily unavailable. Try again shortly.'
        );
      case 'cancelled':
        return new ToolError('CANCELLED', 'The operation was cancelled.');
      case 'unauthorized':
      case 'forbidden':
        // the server's own store key was rejected; details stay in the server log.
        return new ToolError(
          'UPSTREAM_ERROR',
          'The MCP server is not authorised to do this on the store.'
        );
      default:
        return new ToolError(
          'UPSTREAM_ERROR',
          'WooCommerce returned an unexpected error.'
        );
    }
  }
}

export function isWooCommerceError(
  error: unknown
): error is WooCommerceApiError {
  return error instanceof WooCommerceApiError;
}
