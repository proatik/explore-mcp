import { z } from 'zod';

export const OrderNoteSchema = z.object({
  id: z.number().int(),
  author: z.string(),
  dateCreated: z.string(),
  note: z.string(),
  customerVisible: z.boolean()
});

export const OrderLineItemSchema = z.object({
  productId: z.number().int(),
  name: z.string(),
  quantity: z.number().int(),
  total: z.string()
});

// customer contact data is limited to a display name, a masked email and a city.
export const OrderCustomerSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  emailMasked: z.string(),
  city: z.string(),
  country: z.string()
});

export const OrderSummarySchema = z.object({
  id: z.number().int(),
  number: z.string(),
  status: z.string(),
  currency: z.string(),
  total: z.string(),
  dateCreated: z.string(),
  customer: OrderCustomerSchema,
  lineItems: z.array(OrderLineItemSchema),
  paymentMethod: z.string()
});

export const OrderDetailSchema = OrderSummarySchema.extend({
  customerNote: z.string(),
  notes: z.array(OrderNoteSchema)
});

export type OrderNote = z.infer<typeof OrderNoteSchema>;

export type OrderLineItem = z.infer<typeof OrderLineItemSchema>;

export type OrderCustomer = z.infer<typeof OrderCustomerSchema>;

export type OrderSummary = z.infer<typeof OrderSummarySchema>;

export type OrderDetail = z.infer<typeof OrderDetailSchema>;
