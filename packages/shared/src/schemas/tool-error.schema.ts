import { z } from 'zod';

export const ToolErrorCodeSchema = z.enum([
  'NOT_FOUND',
  'FORBIDDEN',
  'VALIDATION_FAILED',
  'CONFLICT',
  'INVALID_TRANSITION',
  'RATE_LIMITED',
  'UPSTREAM_UNAVAILABLE',
  'UPSTREAM_ERROR',
  'CANCELLED',
  'INTERNAL_ERROR'
]);

export const ToolErrorSchema = z.object({
  error: z.object({
    code: ToolErrorCodeSchema,
    message: z.string(),
    retryable: z.boolean(),
    details: z.record(z.string(), z.unknown()).optional()
  })
});

export type ToolErrorCode = z.infer<typeof ToolErrorCodeSchema>;

export type ToolErrorPayload = z.infer<typeof ToolErrorSchema>;
