import { z } from 'zod';

export const ProductUpdateSchema = z
  .object({
    name: z.string(),
    regular_price: z.string(),
    sale_price: z.string(),
    status: z.enum(['publish', 'draft', 'pending', 'private']),
    manage_stock: z.boolean(),
    stock_quantity: z.number().int(),
    stock_status: z.enum(['instock', 'outofstock', 'onbackorder']),
    short_description: z.string(),
    description: z.string()
  })
  .partial();

export const OrderUpdateSchema = z.object({
  status: z
    .enum([
      'pending',
      'processing',
      'on-hold',
      'completed',
      'cancelled',
      'refunded',
      'failed'
    ])
    .optional()
});

export const OrderNoteCreateSchema = z.object({
  note: z.string().trim().min(1),
  customer_note: z.boolean().optional()
});

export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;

export type OrderUpdate = z.infer<typeof OrderUpdateSchema>;

export type OrderNoteCreate = z.infer<typeof OrderNoteCreateSchema>;
