import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { createLogger, requestContext } from '@woocommerce-mcp/shared';

import {
  REQUEST_ID_HEADER,
  REQUEST_ID_PATTERN
} from '@/core/http/http.constants';

import type { NestMiddleware } from '@nestjs/common';
import type { RequestContext } from '@woocommerce-mcp/shared';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = createLogger('http');

  use(req: Request, res: Response, next: NextFunction): void {
    const context: RequestContext = { requestId: this.requestId(req) };
    const started = performance.now();

    res.setHeader(REQUEST_ID_HEADER, context.requestId);

    res.on('finish', () => {
      requestContext.run(context, () => {
        this.logger.log('http request', {
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          durationMs: Math.round(performance.now() - started)
        });
      });
    });

    requestContext.run(context, next);
  }

  private requestId(req: Request): string {
    const value = req.header(REQUEST_ID_HEADER);

    return value && REQUEST_ID_PATTERN.test(value) ? value : randomUUID();
  }
}
