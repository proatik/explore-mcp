import { createLogger } from '@woocommerce-mcp/shared';

import type { LoggerService } from '@nestjs/common';

export class NestLogger implements LoggerService {
  private readonly logger = createLogger('nest');

  log(message: unknown): void {
    this.logger.debug(String(message));
  }

  warn(message: unknown): void {
    this.logger.warn(String(message));
  }

  error(message: unknown, trace?: string): void {
    this.logger.error(String(message), trace ? new Error(trace) : undefined);
  }
}
