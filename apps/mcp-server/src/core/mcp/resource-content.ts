import {
  ProtocolError,
  ProtocolErrorCode,
  ResourceNotFoundError
} from '@modelcontextprotocol/server';

import { createLogger } from '@woocommerce-mcp/shared';

import { hasScope } from '@/core/auth/scope-guard';
import { JSON_MIME_TYPE } from '@/core/mcp/mcp.constants';
import { isWooCommerceError } from '@/core/mcp/tool-error';

import type { Scope } from '@woocommerce-mcp/shared';
import type {
  Variables,
  ServerContext,
  ReadResourceResult
} from '@modelcontextprotocol/server';

const logger = createLogger('resource');

// a failed read is a protocol error: there is no result for a model to read.
export async function readJsonResource(
  ctx: ServerContext,
  uri: string,
  scope: Scope,
  produce: (signal: AbortSignal) => Promise<unknown>
): Promise<ReadResourceResult> {
  if (!hasScope(ctx.http?.authInfo, scope)) {
    throw new ProtocolError(
      ProtocolErrorCode.InvalidRequest,
      `Forbidden: reading ${uri} requires the "${scope}" scope.`
    );
  }

  try {
    const data = await produce(ctx.mcpReq.signal);

    return {
      contents: [
        { uri, mimeType: JSON_MIME_TYPE, text: JSON.stringify(data, null, 2) }
      ]
    };
  } catch (error) {
    if (!isWooCommerceError(error)) throw error;

    if (error.kind === 'not_found') throw new ResourceNotFoundError(uri);

    logger.warn('resource read failed', {
      uri,
      kind: error.kind,
      status: error.status
    });

    throw new ProtocolError(
      ProtocolErrorCode.InternalError,
      'WooCommerce could not provide this resource right now.',
      {
        retryable: error.isRetryable
      }
    );
  }
}

export function templateId(
  variables: Variables,
  name: string,
  uri: string
): number {
  const raw = variables[name];
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (!value || !/^\d{1,10}$/.test(value))
    throw new ResourceNotFoundError(uri, `"${value}" is not a valid ID.`);

  return Number(value);
}
