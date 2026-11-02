import { createLogger } from '@woocommerce-mcp/shared';

import { toolFailure } from '@/core/mcp/tool-result';
import { requireScope } from '@/core/auth/scope-guard';
import { ToolError, isWooCommerceError } from '@/core/mcp/tool-error';

import type { Scope, ToolErrorPayload } from '@woocommerce-mcp/shared';
import type {
  AuthInfo,
  ServerContext,
  CallToolResult
} from '@modelcontextprotocol/server';

export interface ToolCall {
  auth: AuthInfo;
  signal: AbortSignal;
  ctx: ServerContext;
}

export interface GuardedTool {
  name: string;
  scope: Scope;
  subject?: string;
}

const logger = createLogger('tool');

// the SDK has already checked the arguments against the input schema.
export function guardTool<A>(
  tool: GuardedTool,
  run: (args: A, call: ToolCall) => Promise<CallToolResult>
): (args: A, ctx: ServerContext) => Promise<CallToolResult> {
  return async (args, ctx) => {
    const started = performance.now();
    const result = await runSafely(
      tool,
      ctx,
      async (auth) => await run(args, { auth, ctx, signal: ctx.mcpReq.signal })
    );
    const payload = result.structuredContent as ToolErrorPayload | undefined;

    logger.log('tool call', {
      tool: tool.name,
      outcome: result.isError ? 'error' : 'ok',
      errorCode: result.isError ? payload?.error.code : undefined,
      durationMs: Math.round(performance.now() - started)
    });

    return result;
  };
}

async function runSafely(
  tool: GuardedTool,
  ctx: ServerContext,
  run: (auth: AuthInfo) => Promise<CallToolResult>
): Promise<CallToolResult> {
  try {
    const auth = requireScope(ctx.http?.authInfo, tool.scope);

    return await run(auth);
  } catch (error) {
    return toolFailure(toToolError(error, tool));
  }
}

function toToolError(error: unknown, tool: GuardedTool): ToolError {
  if (error instanceof ToolError) return error;

  if (isWooCommerceError(error)) {
    if (error.kind === 'unauthorized' || error.kind === 'forbidden') {
      logger.error('woocommerce rejected the server credentials', error, {
        tool: tool.name
      });
    }

    return ToolError.fromWooCommerce(error, tool.subject);
  }

  logger.error('unexpected tool failure', error, { tool: tool.name });

  return new ToolError(
    'INTERNAL_ERROR',
    'The server hit an unexpected error while running this tool.'
  );
}
