import { Inject, Injectable } from '@nestjs/common';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler } from '@modelcontextprotocol/server';

import { createLogger } from '@woocommerce-mcp/shared';

import { ChangeEvents } from '@/core/mcp/change-events';
import { MCP_SERVER_FACTORY } from '@/core/mcp/mcp-server-factory';

import type { Request, Response } from 'express';
import type { OnModuleDestroy } from '@nestjs/common';
import type { McpHttpHandler } from '@modelcontextprotocol/server';
import type { McpServerFactory } from '@/core/mcp/mcp-server-factory';

@Injectable()
export class McpHandlerService implements OnModuleDestroy {
  private readonly logger = createLogger('mcp');
  private readonly handler: McpHttpHandler;
  private readonly serve: ReturnType<typeof toNodeHandler>;

  constructor(
    private readonly changeEvents: ChangeEvents,
    @Inject(MCP_SERVER_FACTORY) private readonly factory: McpServerFactory
  ) {
    this.handler = createMcpHandler(() => this.factory.create(), {
      onerror: (error) => {
        this.logger.warn('mcp handler error', { error: error.message });
      }
    });
    this.serve = toNodeHandler(this.handler);
    this.changeEvents.bind(this.handler.notify);
  }

  // express has already parsed the json body, so it is handed over as-is.
  async handle(req: Request, res: Response): Promise<void> {
    await this.serve(req, res, req.body);
  }

  async onModuleDestroy(): Promise<void> {
    await this.handler.close();
  }
}
