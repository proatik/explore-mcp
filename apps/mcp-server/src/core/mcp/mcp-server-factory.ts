import type { McpServer } from '@modelcontextprotocol/server';

// the stateless handler calls this once for every request.
export interface McpServerFactory {
  create(): McpServer;
}

export const MCP_SERVER_FACTORY = Symbol('MCP_SERVER_FACTORY');
