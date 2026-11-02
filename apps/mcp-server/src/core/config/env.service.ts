import { z } from 'zod';

import {
  LOCAL_HOSTNAMES,
  RegisteredClientSchema
} from '@/core/config/env.schema';

import type { LogLevel } from '@woocommerce-mcp/shared';
import type { Env, RegisteredClient } from '@/core/config/env.schema';
import type { WooCommerceClientOptions } from '@/core/woocommerce/woocommerce-client';

const DEFAULT_CLIENT_ID = 'agent';

export class EnvService {
  readonly clients: RegisteredClient[];

  constructor(private readonly env: Env) {
    this.clients = this.parseClients();
  }

  get logLevel(): LogLevel {
    return this.env.LOG_LEVEL;
  }

  get host(): string {
    return this.env.MCP_HOST;
  }

  get port(): number {
    return this.env.MCP_PORT;
  }

  get allowedHosts(): string[] {
    const listed = this.env.MCP_ALLOWED_HOSTS?.split(',')
      .map((host) => host.trim())
      .filter(Boolean);

    return listed?.length ? listed : LOCAL_HOSTNAMES;
  }

  get rateLimitPerMinute(): number {
    return this.env.MCP_RATE_LIMIT_PER_MINUTE;
  }

  get storeUrl(): string {
    return this.env.WOO_BASE_URL.replace(/\/$/, '');
  }

  get woocommerce(): WooCommerceClientOptions {
    return {
      baseUrl: this.storeUrl,
      consumerKey: this.env.WOO_CONSUMER_KEY,
      consumerSecret: this.env.WOO_CONSUMER_SECRET,
      timeoutMs: this.env.WOO_TIMEOUT_MS,
      maxRetries: this.env.WOO_MAX_RETRIES,
      retryBaseDelayMs: this.env.WOO_RETRY_BASE_DELAY_MS
    };
  }

  private parseClients(): RegisteredClient[] {
    if (!this.env.MCP_CLIENTS) {
      return [
        {
          id: DEFAULT_CLIENT_ID,
          token: this.env.MCP_CLIENT_TOKEN ?? '',
          scopes: ['*']
        }
      ];
    }

    let json: unknown;

    try {
      json = JSON.parse(this.env.MCP_CLIENTS);
    } catch (error) {
      throw new Error(
        'Invalid server configuration: MCP_CLIENTS must be a JSON array.',
        { cause: error }
      );
    }

    const parsed = z.array(RegisteredClientSchema).min(1).safeParse(json);

    if (!parsed.success) {
      const problems = parsed.error.issues.map(
        (issue) => `  - MCP_CLIENTS.${issue.path.join('.')}: ${issue.message}`
      );

      throw new Error(`Invalid server configuration:\n${problems.join('\n')}`);
    }

    return parsed.data;
  }
}
