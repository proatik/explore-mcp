import {
  Get,
  Post,
  Inject,
  HttpCode,
  HttpStatus,
  Controller
} from '@nestjs/common';

import { LLM_PROVIDER } from '@/modules/llm/llm.constants';
import { ApprovalPolicy } from '@/modules/approval/approval-policy';
import { RegistryService } from '@/modules/connection/registry.service';

import type { LlmProvider } from '@/modules/llm/llm.types';
import type { ClientStatus } from '@/modules/status/status.types';

@Controller('api/status')
export class StatusController {
  private readonly policy = new ApprovalPolicy();

  constructor(
    private readonly registry: RegistryService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider | null
  ) {}

  @Get()
  getStatus(): ClientStatus {
    const { registry } = this.registry;

    return {
      model: this.llm?.name ?? null,
      servers: registry.connections.map((connection) => {
        const catalog = registry.catalog(connection.name);

        return {
          name: connection.name,
          state: connection.state,
          ...(catalog?.info.protocolVersion
            ? { protocolVersion: catalog.info.protocolVersion }
            : {}),
          tools: catalog?.tools.length ?? 0,
          resources: catalog?.resources.length ?? 0,
          prompts: catalog?.prompts.length ?? 0
        };
      }),
      tools: registry.tools().map((entry) => ({
        name: entry.qualifiedName,
        title: entry.tool.title ?? entry.tool.name,
        approval: this.policy.evaluate({
          server: entry.server,
          tool: entry.tool.name,
          args: {},
          annotations: entry.tool.annotations
        })
      }))
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(): Promise<{ message: string }> {
    await this.registry.refresh();

    return { message: 'Servers refreshed.' };
  }
}
