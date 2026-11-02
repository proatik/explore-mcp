import { z } from 'zod';

export const StockLevelSchema = z.object({
  productId: z.number().int(),
  name: z.string(),
  sku: z.string(),
  manageStock: z.boolean(),
  stockQuantity: z.number().int().nullable(),
  stockStatus: z.string()
});

export type StockLevel = z.infer<typeof StockLevelSchema>;
