import { z } from 'zod';

export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int(),
    perPage: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int()
  });
}

export type Page<T> = {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};
