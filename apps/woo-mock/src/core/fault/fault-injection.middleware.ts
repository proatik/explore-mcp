import { Inject, Injectable } from '@nestjs/common';

import { FaultService } from '@/core/fault/fault.service';
import { MOCK_STORE_OPTIONS } from '@/core/config/mock-store-options';

import type { NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import type { MockStoreOptions } from '@/core/config/mock-store-options';

@Injectable()
export class FaultInjectionMiddleware implements NestMiddleware {
  constructor(
    private readonly faults: FaultService,
    @Inject(MOCK_STORE_OPTIONS) private readonly options: MockStoreOptions
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const path = req.originalUrl.split('?')[0] ?? '/';

    this.faults.record({ method: req.method, path });

    if (this.options.shouldLog)
      console.log(`[woo-mock] ${req.method} ${req.originalUrl}`);

    const fault = this.faults.take(req.method, path);

    if (!fault) return next();

    if (fault.status === 'hang') return this.faults.hold(res);

    if (fault.status === 429) res.setHeader('Retry-After', '1');

    res.status(fault.status).json({
      code: 'mock_injected_fault',
      message: `Injected fault (${fault.status}).`,
      data: { status: fault.status }
    });
  }
}
