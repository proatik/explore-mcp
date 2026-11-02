import { Catch, HttpException } from '@nestjs/common';

import { MockHttpError } from '@/core/http/mock-http-error';

import type { Response } from 'express';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';

// a deliberate exception: this mock must answer in woocommerce's error shape.
// nest's own { statusCode, message, error } body would not match a real store.
@Catch()
export class WooCommerceErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const error = this.toMockError(exception);

    response.status(error.status).json({
      code: error.code,
      message: error.message,
      data: { status: error.status }
    });
  }

  private toMockError(exception: unknown): MockHttpError {
    if (exception instanceof MockHttpError) return exception;

    if (!(exception instanceof HttpException)) {
      return new MockHttpError(500, 'internal_error', 'Internal server error.');
    }

    if (exception.getStatus() === 404) {
      return new MockHttpError(
        404,
        'rest_no_route',
        'No route was found matching the URL and request method.'
      );
    }

    return new MockHttpError(
      exception.getStatus(),
      'rest_invalid_request',
      exception.message
    );
  }
}
