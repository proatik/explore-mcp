import { z } from 'zod';

// an empty `KEY=` line in a .env file reads as unset, not as an empty value.
export function blankAsUnset<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema);
}
