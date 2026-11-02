import { Injectable } from '@nestjs/common';

import { MockHttpError } from '@/core/http/mock-http-error';

import type { z } from 'zod';
import type { PipeTransform } from '@nestjs/common';

// woocommerce answers a non-numeric ID with "no route", not a 400.
@Injectable()
export class RecordIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = Number(value);

    if (!Number.isInteger(id)) {
      throw new MockHttpError(
        404,
        'rest_no_route',
        'No route was found matching the URL and request method.'
      );
    }

    return id;
  }
}

export class ZodBodyPipe<T extends z.ZodType> implements PipeTransform<
  unknown,
  z.infer<T>
> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const parsed = this.schema.safeParse(value ?? {});

    if (!parsed.success)
      throw new MockHttpError(
        400,
        'rest_invalid_param',
        'Invalid parameter(s).'
      );

    return parsed.data;
  }
}
