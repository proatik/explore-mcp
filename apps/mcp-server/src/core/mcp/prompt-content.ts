import { z } from 'zod';
import { ProtocolError, ProtocolErrorCode } from '@modelcontextprotocol/server';

import { createLogger } from '@woocommerce-mcp/shared';

import { hasScope } from '@/core/auth/scope-guard';
import { JSON_MIME_TYPE } from '@/core/mcp/mcp.constants';
import { isWooCommerceError } from '@/core/mcp/tool-error';

import type { Scope } from '@woocommerce-mcp/shared';
import type {
  PromptMessage,
  ServerContext
} from '@modelcontextprotocol/server';

const logger = createLogger('prompt');

export function textMessage(text: string): PromptMessage {
  return { role: 'user', content: { type: 'text', text } };
}

export function resourceMessage(uri: string, data: unknown): PromptMessage {
  return {
    role: 'user',
    content: {
      type: 'resource',
      resource: {
        uri,
        mimeType: JSON_MIME_TYPE,
        text: JSON.stringify(data, null, 2)
      }
    }
  };
}

// a factory: completable() tags the schema object it receives.
// so describe() runs first, and completable() wraps the result last.
export function numericIdArgument(description: string) {
  return z
    .string()
    .regex(/^\d{1,10}$/, 'Must be a numeric ID.')
    .describe(description);
}

export async function loadPromptData<T>(
  ctx: ServerContext,
  scope: Scope,
  subject: string,
  fetch: () => Promise<T>
): Promise<T> {
  if (!hasScope(ctx.http?.authInfo, scope)) {
    throw new ProtocolError(
      ProtocolErrorCode.InvalidRequest,
      `Forbidden: this prompt requires the "${scope}" scope.`
    );
  }

  try {
    return await fetch();
  } catch (error) {
    if (!isWooCommerceError(error)) throw error;

    if (error.kind === 'not_found') {
      throw new ProtocolError(
        ProtocolErrorCode.InvalidParams,
        `The ${subject} does not exist.`
      );
    }

    logger.warn('prompt data load failed', { subject, kind: error.kind });

    throw new ProtocolError(
      ProtocolErrorCode.InternalError,
      'WooCommerce could not provide the data for this prompt right now.'
    );
  }
}
