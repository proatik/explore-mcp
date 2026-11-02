import { Injectable, HttpStatus, HttpException } from '@nestjs/common';

import { RateLimiter } from '@/core/rate-limit/rate-limiter.service';
import {
  RATE_LIMIT_REACHED_ERROR,
  RATE_LIMIT_REACHED_MESSAGE
} from '@/core/rate-limit/rate-limit.constants';

import type { Response } from 'express';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '@/core/auth/bearer-auth.guard';

// runs after authentication, so the limit is counted per MCP client.
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly limiter: RateLimiter) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const retryAfter = this.limiter.check(
      request.auth?.clientId ?? 'anonymous'
    );

    if (retryAfter === 0) return true;

    http.getResponse<Response>().setHeader('Retry-After', String(retryAfter));

    throw new HttpException(
      HttpException.createBody(
        RATE_LIMIT_REACHED_MESSAGE,
        RATE_LIMIT_REACHED_ERROR,
        HttpStatus.TOO_MANY_REQUESTS
      ),
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}
