export const CLIENT_INFO = {
  name: 'woocommerce-mcp-client',
  version: '0.1.0'
} as const;

export const CONNECT_TIMEOUT_MS = 10_000;

export const REQUEST_TIMEOUT_MS = 30_000;

export const MAX_CONNECT_ATTEMPTS = 3;

export const RETRY_BASE_DELAY_MS = 300;

export const TOOL_NAMESPACE_SEPARATOR = '__';

/**
 * 'TOOL_NAMESPACE_SEPARATOR' fits the LLM tool-name pattern [a-zA-Z0-9_-].
 */
