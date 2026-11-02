import { z } from 'zod';

export const CustomerSummarySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  emailMasked: z.string(),
  city: z.string(),
  country: z.string(),
  isPayingCustomer: z.boolean(),
  dateCreated: z.string()
});

export type CustomerSummary = z.infer<typeof CustomerSummarySchema>;
