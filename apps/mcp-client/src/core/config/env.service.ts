import { z } from 'zod';

import { ServerEntrySchema } from '@/core/config/env.schema';

import type { LogLevel } from '@woocommerce-mcp/shared';
import type { Env, ServerEntry } from '@/core/config/env.schema';

export interface OpenAISettings {
  apiKey: string | undefined;
  model: string;
  baseUrl: string | undefined;
}

const PRIMARY_SERVER_NAME = 'woocommerce';

export class EnvService {
  readonly servers: ServerEntry[];

  constructor(private readonly env: Env) {
    this.servers = this.parseServers();
  }

  get host(): string {
    return this.env.CLIENT_HOST;
  }

  get port(): number {
    return this.env.CLIENT_PORT;
  }

  get logLevel(): LogLevel {
    return this.env.LOG_LEVEL;
  }

  get requestTimeoutMs(): number {
    return this.env.MCP_REQUEST_TIMEOUT_MS;
  }

  get maxSteps(): number {
    return this.env.AGENT_MAX_STEPS;
  }

  get openai(): OpenAISettings {
    return {
      apiKey: this.env.OPENAI_API_KEY,
      model: this.env.OPENAI_MODEL,
      baseUrl: this.env.OPENAI_BASE_URL
    };
  }

  private parseServers(): ServerEntry[] {
    const token = this.env.MCP_CLIENT_TOKEN;
    const primary: ServerEntry = {
      name: PRIMARY_SERVER_NAME,
      url: this.env.MCP_SERVER_URL,
      ...(token ? { token } : {})
    };
    const servers = [primary, ...this.parseExtraServers()];
    const names = new Set<string>();

    for (const server of servers) {
      if (names.has(server.name))
        throw new Error(`Duplicate MCP server name "${server.name}".`);

      names.add(server.name);
    }

    return servers;
  }

  private parseExtraServers(): ServerEntry[] {
    if (!this.env.MCP_EXTRA_SERVERS) return [];

    const parsed = z
      .array(ServerEntrySchema)
      .safeParse(JSON.parse(this.env.MCP_EXTRA_SERVERS));

    if (!parsed.success)
      throw new Error(
        `Invalid MCP_EXTRA_SERVERS: ${parsed.error.issues[0]?.message}`
      );

    return parsed.data;
  }
}
