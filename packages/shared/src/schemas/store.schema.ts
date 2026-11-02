import { z } from 'zod';

export const StoreInfoSchema = z.object({
  name: z.string(),
  description: z.string(),
  url: z.string(),
  currency: z.string(),
  country: z.string(),
  timezone: z.string()
});

export const StoreSettingSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string()
});

export type StoreInfo = z.infer<typeof StoreInfoSchema>;

export type StoreSetting = z.infer<typeof StoreSettingSchema>;
