import {
  Client,
  StreamableHTTPClientTransport
} from '@modelcontextprotocol/client';

import { classifyError, describeError } from '@/core/error/classify-error';
import {
  CLIENT_INFO,
  CONNECT_TIMEOUT_MS,
  REQUEST_TIMEOUT_MS,
  RETRY_BASE_DELAY_MS,
  MAX_CONNECT_ATTEMPTS
} from '@/modules/connection/connection.constants';

import type {
  Implementation,
  ServerCapabilities
} from '@modelcontextprotocol/client';

export type ConnectionState =
  'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed';

export interface ConnectionOptions {
  name: string;
  url: string;
  token?: string;
  clientInfo?: Implementation;
  connectTimeoutMs?: number;
  requestTimeoutMs?: number;
  maxConnectAttempts?: number;
  retryBaseDelayMs?: number;
  onStateChange?: (state: ConnectionState, detail?: string) => void;
}

export interface ServerInfo {
  name: string;
  version: string;
  protocolVersion: string | undefined;
  era: string | undefined;
  capabilities: ServerCapabilities;
  instructions: string | undefined;
}

export interface UseOptions {
  // only for operations that are safe to repeat, such as reads.
  shouldRetryOnDisconnect?: boolean;
}

// authentication failures are never retried; retrying cannot fix them.
export class McpConnection {
  readonly name: string;

  private client: Client | undefined;
  private connectionState: ConnectionState = 'idle';
  private connecting: Promise<Client> | undefined;
  private readonly clientSetups: Array<(client: Client) => void> = [];

  constructor(private readonly options: ConnectionOptions) {
    this.name = options.name;
  }

  get state(): ConnectionState {
    return this.connectionState;
  }

  get requestTimeoutMs(): number {
    return this.options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  }

  info(): ServerInfo {
    const client = this.connectedClient();
    const version = client.getServerVersion();

    return {
      name: version?.name ?? this.name,
      version: version?.version ?? 'unknown',
      protocolVersion: client.getNegotiatedProtocolVersion(),
      era: client.getProtocolEra(),
      capabilities: client.getServerCapabilities() ?? {},
      instructions: client.getInstructions()
    };
  }

  // runs on every new client, so notification handlers survive reconnects.
  onClient(setup: (client: Client) => void): void {
    this.clientSetups.push(setup);

    if (this.client && this.connectionState === 'connected') setup(this.client);
  }

  async connect(): Promise<Client> {
    if (this.connectionState === 'closed')
      throw new Error(`Connection "${this.name}" is closed.`);

    if (this.client && this.connectionState === 'connected') return this.client;

    this.connecting ??= this.connectWithRetry().finally(() => {
      this.connecting = undefined;
    });

    return await this.connecting;
  }

  async use<T>(
    operation: (client: Client) => Promise<T>,
    options: UseOptions = {}
  ): Promise<T> {
    const client = await this.connect();

    try {
      return await operation(client);
    } catch (error) {
      const canRetry =
        options.shouldRetryOnDisconnect && classifyError(error) === 'transient';

      if (!canRetry || this.connectionState === 'closed') throw error;

      this.setState('reconnecting', describeError(error));

      await this.dispose();

      const fresh = await this.connect();

      return await operation(fresh);
    }
  }

  async close(): Promise<void> {
    this.setState('closed');

    await this.dispose();
  }

  private connectedClient(): Client {
    if (!this.client || this.connectionState !== 'connected') {
      throw new Error(`MCP server "${this.name}" is not connected.`);
    }

    return this.client;
  }

  private async connectWithRetry(): Promise<Client> {
    const maxAttempts = this.options.maxConnectAttempts ?? MAX_CONNECT_ATTEMPTS;
    let lastError: unknown;

    this.setState(
      this.connectionState === 'reconnecting' ? 'reconnecting' : 'connecting'
    );

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.connectOnce();
      } catch (error) {
        lastError = error;

        if (classifyError(error) === 'auth' || attempt === maxAttempts) break;

        const delay =
          (this.options.retryBaseDelayMs ?? RETRY_BASE_DELAY_MS) *
          2 ** (attempt - 1);

        this.options.onStateChange?.(
          this.connectionState,
          `attempt ${attempt} failed (${describeError(error)}), retrying in ${delay}ms`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    this.setState('idle', describeError(lastError));

    throw lastError;
  }

  private async connectOnce(): Promise<Client> {
    const client = new Client(this.options.clientInfo ?? CLIENT_INFO, {
      capabilities: {},
      versionNegotiation: { mode: 'auto' }
    });

    const headers = this.options.token
      ? { Authorization: `Bearer ${this.options.token}` }
      : undefined;
    const transport = new StreamableHTTPClientTransport(
      new URL(this.options.url),
      headers ? { requestInit: { headers } } : {}
    );

    try {
      await client.connect(transport, {
        timeout: this.options.connectTimeoutMs ?? CONNECT_TIMEOUT_MS
      });
    } catch (error) {
      await client.close().catch(() => undefined);

      throw error;
    }

    client.onclose = () => {
      if (this.client === client && this.connectionState === 'connected')
        this.setState('idle', 'transport closed');
    };

    this.client = client;

    for (const setup of this.clientSetups) setup(client);

    this.setState('connected');

    return client;
  }

  private async dispose(): Promise<void> {
    const client = this.client;

    this.client = undefined;

    await client?.close().catch(() => undefined);
  }

  private setState(state: ConnectionState, detail?: string): void {
    if (this.connectionState === 'closed' && state !== 'closed') return;

    this.connectionState = state;
    this.options.onStateChange?.(state, detail);
  }
}
