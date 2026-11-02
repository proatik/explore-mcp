import { Inject, Injectable } from '@nestjs/common';

import { MockHttpError } from '@/core/http/mock-http-error';
import { MOCK_STORE_OPTIONS } from '@/core/config/mock-store-options';

import type { Request } from 'express';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { MockStoreOptions } from '@/core/config/mock-store-options';

// woocommerce accepts basic auth over HTTPS, or keys in the query string.
@Injectable()
export class ConsumerKeyGuard implements CanActivate {
  constructor(
    @Inject(MOCK_STORE_OPTIONS) private readonly options: MockStoreOptions
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const [key, secret] = this.credentials(request);

    if (
      key === this.options.consumerKey &&
      secret === this.options.consumerSecret
    )
      return true;

    throw new MockHttpError(
      401,
      'woocommerce_rest_cannot_view',
      'Sorry, you cannot list resources.'
    );
  }

  private credentials(
    request: Request
  ): [string | undefined, string | undefined] {
    const header = request.headers.authorization;

    if (header?.startsWith('Basic ')) {
      const [key, secret] = Buffer.from(header.slice(6), 'base64')
        .toString('utf8')
        .split(':');

      return [key, secret];
    }

    const { consumer_key: key, consumer_secret: secret } = request.query;

    return [
      typeof key === 'string' ? key : undefined,
      typeof secret === 'string' ? secret : undefined
    ];
  }
}
