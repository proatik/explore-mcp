import { Injectable } from '@nestjs/common';
import {
  originValidation,
  hostHeaderValidation
} from '@modelcontextprotocol/node';

import { EnvService } from '@/core/config/env.service';

import type { NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

// blocks DNS rebinding: a page on another domain resolving to this server.
@Injectable()
export class HostOriginMiddleware implements NestMiddleware {
  private readonly validateHost: ReturnType<typeof hostHeaderValidation>;
  private readonly validateOrigin: ReturnType<typeof originValidation>;

  constructor(env: EnvService) {
    this.validateHost = hostHeaderValidation(env.allowedHosts);
    this.validateOrigin = originValidation(env.allowedHosts);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    if (this.validateHost(req, res) && this.validateOrigin(req, res)) next();
  }
}
