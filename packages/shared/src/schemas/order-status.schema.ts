import { z } from 'zod';

export const OrderStatusSchema = z.enum([
  'pending',
  'processing',
  'on-hold',
  'completed',
  'cancelled',
  'refunded',
  'failed'
]);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;
