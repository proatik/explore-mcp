import { All, Req, Res, UseGuards, Controller } from '@nestjs/common';

import { BearerAuthGuard } from '@/core/auth/bearer-auth.guard';
import { McpHandlerService } from '@/core/mcp/mcp-handler.service';
import { RateLimitGuard } from '@/core/rate-limit/rate-limit.guard';

import type { Request, Response } from 'express';

@Controller('mcp')
@UseGuards(BearerAuthGuard, RateLimitGuard)
export class McpController {
  constructor(private readonly mcp: McpHandlerService) {}

  @All()
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.mcp.handle(req, res);
  }
}
