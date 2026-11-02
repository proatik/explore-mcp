import type { McpConnection } from '@/modules/connection/mcp-connection';
import type {
  Client,
  Progress,
  CompleteResult,
  CallToolResult,
  GetPromptResult,
  ReadResourceResult
} from '@modelcontextprotocol/client';

export interface ToolCallOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  onProgress?: (progress: Progress) => void;
  // never set for writes: a write may have landed before the failure.
  shouldRetryOnDisconnect?: boolean;
}

export type CompletionRef =
  { type: 'ref/prompt'; name: string } | { type: 'ref/resource'; uri: string };

export interface ResourceSubscription {
  uris: string[];
  closed: Promise<string>;
  close(): Promise<void>;
}

export async function callTool(
  connection: McpConnection,
  name: string,
  args: Record<string, unknown>,
  options: ToolCallOptions = {}
): Promise<CallToolResult> {
  const requestOptions = {
    timeout: options.timeoutMs ?? connection.requestTimeoutMs,
    ...(options.signal ? { signal: options.signal } : {}),
    ...(options.onProgress
      ? { onprogress: options.onProgress, resetTimeoutOnProgress: true }
      : {})
  };

  return await connection.use(
    async (client) =>
      (await client.callTool(
        { name, arguments: args },
        requestOptions
      )) as CallToolResult,
    { shouldRetryOnDisconnect: options.shouldRetryOnDisconnect ?? false }
  );
}

export async function readResource(
  connection: McpConnection,
  uri: string,
  signal?: AbortSignal
): Promise<ReadResourceResult> {
  return await connection.use(
    async (client) =>
      await client.readResource({ uri }, signal ? { signal } : {}),
    {
      shouldRetryOnDisconnect: true
    }
  );
}

export async function getPrompt(
  connection: McpConnection,
  name: string,
  args: Record<string, string> = {}
): Promise<GetPromptResult> {
  return await connection.use(
    async (client) => await client.getPrompt({ name, arguments: args }),
    {
      shouldRetryOnDisconnect: true
    }
  );
}

export async function complete(
  connection: McpConnection,
  ref: CompletionRef,
  argument: { name: string; value: string }
): Promise<CompleteResult> {
  return await connection.use(
    async (client) => await client.complete({ ref, argument }),
    {
      shouldRetryOnDisconnect: true
    }
  );
}

// a 2026-07-28 connection opens a subscriptions/listen stream.
// a 2025-era connection falls back to resources/subscribe.
export async function subscribeResources(
  connection: McpConnection,
  uris: string[],
  onUpdated: (uri: string) => void
): Promise<ResourceSubscription> {
  const wanted = new Set(uris);

  connection.onClient((client) => {
    client.setNotificationHandler(
      'notifications/resources/updated',
      async (notification) => {
        if (wanted.has(notification.params.uri))
          onUpdated(notification.params.uri);
      }
    );
  });

  return await connection.use(async (client) => {
    if (!client.getServerCapabilities()?.resources?.subscribe) {
      throw new Error(
        `Server "${connection.name}" does not support resource subscriptions.`
      );
    }

    if (client.getProtocolEra() === 'modern') return await listen(client, uris);

    return await subscribeLegacy(client, uris);
  });
}

async function listen(
  client: Client,
  uris: string[]
): Promise<ResourceSubscription> {
  const subscription = await client.listen({ resourceSubscriptions: uris });

  return {
    uris: subscription.honoredFilter.resourceSubscriptions ?? [],
    closed: subscription.closed,
    close: async () => {
      await subscription.close();
    }
  };
}

async function subscribeLegacy(
  client: Client,
  uris: string[]
): Promise<ResourceSubscription> {
  await Promise.all(
    uris.map(async (uri) => await client.subscribeResource({ uri }))
  );

  const { promise: closed, resolve } = Promise.withResolvers<string>();

  return {
    uris,
    closed,
    close: async () => {
      await Promise.all(
        uris.map(async (uri) => await client.unsubscribeResource({ uri }))
      );

      resolve('local');
    }
  };
}
