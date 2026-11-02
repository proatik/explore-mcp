import type {
  ServerInfo,
  McpConnection
} from '@/modules/connection/mcp-connection';
import type {
  Tool,
  Prompt,
  Resource,
  ResourceTemplateType
} from '@modelcontextprotocol/client';

export interface ServerCatalog {
  server: string;
  info: ServerInfo;
  tools: Tool[];
  resources: Resource[];
  resourceTemplates: ResourceTemplateType[];
  prompts: Prompt[];
}

// each list call runs only when the server advertised that capability.
export async function discoverServer(
  connection: McpConnection
): Promise<ServerCatalog> {
  return await connection.use(
    async (client) => {
      const info = connection.info();
      const { tools, resources, prompts } = info.capabilities;
      const [toolList, resourceList, templateList, promptList] =
        await Promise.all([
          tools ? client.listTools() : undefined,
          resources ? client.listResources() : undefined,
          resources ? client.listResourceTemplates() : undefined,
          prompts ? client.listPrompts() : undefined
        ]);

      return {
        server: connection.name,
        info,
        tools: toolList?.tools ?? [],
        resources: resourceList?.resources ?? [],
        resourceTemplates: templateList?.resourceTemplates ?? [],
        prompts: promptList?.prompts ?? []
      };
    },
    { shouldRetryOnDisconnect: true }
  );
}
