import { z } from 'zod';

export const ScopeSchema = z.enum([
  'store:read',
  'products:read',
  'products:write',
  'orders:read',
  'orders:write',
  'inventory:read',
  'inventory:write',
  'customers:read'
]);

export type Scope = z.infer<typeof ScopeSchema>;
