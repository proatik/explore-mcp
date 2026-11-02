import { ToolError } from '@/core/mcp/tool-error';

import type { Scope } from '@woocommerce-mcp/shared';
import type { AuthInfo } from '@modelcontextprotocol/server';

export function hasScope(auth: AuthInfo | undefined, scope: Scope): boolean {
  return !!auth && (auth.scopes.includes('*') || auth.scopes.includes(scope));
}

export function requireScope(
  auth: AuthInfo | undefined,
  scope: Scope
): AuthInfo {
  if (!auth)
    throw new ToolError(
      'FORBIDDEN',
      'This server requires an authenticated MCP client.'
    );

  if (!hasScope(auth, scope)) {
    throw new ToolError(
      'FORBIDDEN',
      `Client "${auth.clientId}" is not granted the "${scope}" scope.`,
      {
        details: { requiredScope: scope }
      }
    );
  }

  return auth;
}
