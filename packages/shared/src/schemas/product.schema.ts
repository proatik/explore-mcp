import { z } from 'zod';

export const ProductSummarySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  sku: z.string(),
  type: z.string(),
  status: z.string(),
  price: z.string(),
  regularPrice: z.string(),
  salePrice: z.string(),
  stockStatus: z.string(),
  manageStock: z.boolean(),
  stockQuantity: z.number().int().nullable(),
  categories: z.array(z.string()),
  permalink: z.string()
});

export const ProductDetailSchema = ProductSummarySchema.extend({
  shortDescription: z.string(),
  description: z.string(),
  dateModified: z.string()
});

export type ProductSummary = z.infer<typeof ProductSummarySchema>;

export type ProductDetail = z.infer<typeof ProductDetailSchema>;
