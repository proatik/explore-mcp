import { z } from 'zod';

export function idSchema(subject: string) {
  return z
    .number()
    .int()
    .positive()
    .max(2_147_483_647)
    .describe(`The WooCommerce ${subject} ID`);
}

export const paginationShape = {
  page: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(1)
    .describe('Page number, starting at 1'),
  perPage: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe('Items per page (max 50)')
};

export const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/)
  .optional()
  .describe(
    'Optional client-generated key. Retrying with the same key returns the first result instead of applying the change twice.'
  );
