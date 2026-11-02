import { callTool } from '@/modules/operation/mcp-operations';
import { discoverServer } from '@/modules/discovery/discover-server';
import { TOOL_NAMESPACE_SEPARATOR } from '@/modules/connection/connection.constants';

import type { Tool, CallToolResult } from '@modelcontextprotocol/client';
import type { McpConnection } from '@/modules/connection/mcp-connection';
import type { ServerCatalog } from '@/modules/discovery/discover-server';
import type { ToolCallOptions } from '@/modules/operation/mcp-operations';

export interface RegisteredTool {
  qualifiedName: string;
  server: string;
  tool: Tool;
}

export interface RefreshResult {
  catalogs: ServerCatalog[];
  failures: Array<{ server: string; error: unknown }>;
}

// tool names get a server prefix once more than one server is connected.
export class ServerRegistry {
  private readonly connectionsByName = new Map<string, McpConnection>();
  private readonly catalogs = new Map<string, ServerCatalog>();
  private toolsByName = new Map<string, RegisteredTool>();

  get connections(): McpConnection[] {
    return [...this.connectionsByName.values()];
  }

  get primary(): McpConnection {
    const first = this.connections[0];

    if (!first) throw new Error('No MCP servers are configured.');

    return first;
  }

  add(connection: McpConnection): this {
    if (this.connectionsByName.has(connection.name))
      throw new Error(`Duplicate server name "${connection.name}".`);

    this.connectionsByName.set(connection.name, connection);

    return this;
  }

  get(name: string): McpConnection {
    const connection = this.connectionsByName.get(name);

    if (!connection) throw new Error(`Unknown MCP server "${name}".`);

    return connection;
  }

  // a server that fails is reported and skipped, so one outage is contained.
  async refresh(): Promise<RefreshResult> {
    const connections = this.connections;
    const results = await Promise.allSettled(
      connections.map(async (connection) => await discoverServer(connection))
    );
    const failures: RefreshResult['failures'] = [];

    this.catalogs.clear();

    results.forEach((result, index) => {
      const server = connections[index]?.name ?? '';

      if (result.status === 'fulfilled')
        this.catalogs.set(server, result.value);
      else failures.push({ server, error: result.reason });
    });

    this.rebuildToolIndex();

    return { catalogs: [...this.catalogs.values()], failures };
  }

  catalog(server: string): ServerCatalog | undefined {
    return this.catalogs.get(server);
  }

  tools(): RegisteredTool[] {
    return [...this.toolsByName.values()];
  }

  resolveTool(qualifiedName: string): RegisteredTool | undefined {
    return this.toolsByName.get(qualifiedName);
  }

  async callTool(
    qualifiedName: string,
    args: Record<string, unknown>,
    options?: ToolCallOptions
  ): Promise<CallToolResult> {
    const entry = this.toolsByName.get(qualifiedName);

    if (!entry) throw new Error(`Unknown tool "${qualifiedName}".`);

    return await callTool(
      this.get(entry.server),
      entry.tool.name,
      args,
      options
    );
  }

  async closeAll(): Promise<void> {
    await Promise.all(
      this.connections.map(async (connection) => await connection.close())
    );
  }

  private rebuildToolIndex(): void {
    const isNamespaced = this.connectionsByName.size > 1;
    const tools = new Map<string, RegisteredTool>();

    for (const catalog of this.catalogs.values()) {
      for (const tool of catalog.tools) {
        const qualifiedName = isNamespaced
          ? `${catalog.server}${TOOL_NAMESPACE_SEPARATOR}${tool.name}`
          : tool.name;

        tools.set(qualifiedName, {
          qualifiedName,
          server: catalog.server,
          tool
        });
      }
    }

    this.toolsByName = tools;
  }
}
