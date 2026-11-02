import { BadRequestException } from '@nestjs/common';

import type { z } from 'zod';
import type { PipeTransform } from '@nestjs/common';

export class ZodBodyPipe<T extends z.ZodType> implements PipeTransform<
  unknown,
  z.infer<T>
> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const parsed = this.schema.safeParse(value);

    if (!parsed.success) throw new BadRequestException('Invalid request body.');

    return parsed.data;
  }
}
