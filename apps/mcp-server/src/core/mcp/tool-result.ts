import type { ToolError } from '@/core/mcp/tool-error';
import type { ToolErrorPayload } from '@woocommerce-mcp/shared';
import type { CallToolResult } from '@modelcontextprotocol/server';

export function toolSuccess<T extends Record<string, unknown>>(
  data: T,
  summary?: string
): CallToolResult {
  const json = JSON.stringify(data);

  return {
    content: [{ type: 'text', text: summary ? `${summary}\n\n${json}` : json }],
    structuredContent: data
  };
}

export function toolFailure(error: ToolError): CallToolResult {
  const payload: ToolErrorPayload = {
    error: {
      code: error.code,
      message: error.message,
      retryable: error.isRetryable,
      ...(error.details ? { details: error.details } : {})
    }
  };

  return {
    isError: true,
    content: [{ type: 'text', text: `${error.code}: ${error.message}` }],
    structuredContent: payload
  };
}
