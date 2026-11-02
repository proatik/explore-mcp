import { Injectable } from '@nestjs/common';

import { createLogger } from '@woocommerce-mcp/shared';

import { EnvService } from '@/core/config/env.service';
import { McpConnection } from '@/modules/connection/mcp-connection';
import { ServerRegistry } from '@/modules/connection/server-registry';
import { classifyError, describeError } from '@/core/error/classify-error';

import type {
  OnApplicationShutdown,
  OnApplicationBootstrap
} from '@nestjs/common';

@Injectable()
export class RegistryService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  readonly registry = new ServerRegistry();

  private readonly logger = createLogger('registry');

  constructor(env: EnvService) {
    for (const server of env.servers) {
      this.registry.add(
        new McpConnection({
          name: server.name,
          url: server.url,
          ...(server.token ? { token: server.token } : {}),
          requestTimeoutMs: env.requestTimeoutMs,
          onStateChange: (state, detail) => {
            this.logger.log('mcp connection state', {
              server: server.name,
              state,
              detail
            });
          }
        })
      );
    }
  }

  // a server that is down at boot is retried on the next refresh.
  async onApplicationBootstrap(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const { failures } = await this.registry.refresh();

    for (const failure of failures) {
      this.logger.warn('mcp server unavailable', {
        server: failure.server,
        kind: classifyError(failure.error),
        reason: describeError(failure.error)
      });
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.registry.closeAll();
  }
}
