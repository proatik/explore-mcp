import { z } from 'zod';

import {
  ScopeSchema,
  blankAsUnset,
  LogLevelSchema
} from '@woocommerce-mcp/shared';

export const RegisteredClientSchema = z.object({
  id: z.string().min(1),
  token: z.string().min(16, 'Client tokens must be at least 16 characters.'),
  scopes: z.array(z.union([ScopeSchema, z.literal('*')])).min(1)
});

export type RegisteredClient = z.infer<typeof RegisteredClientSchema>;

export const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'];

export const envSchema = z
  .object({
    WOO_BASE_URL: z.url(),
    WOO_CONSUMER_KEY: z.string().min(1),
    WOO_CONSUMER_SECRET: z.string().min(1),
    WOO_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(500)
      .max(60_000)
      .default(10_000),
    WOO_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
    WOO_RETRY_BASE_DELAY_MS: z.coerce.number().int().min(1).default(200),
    WOO_ALLOW_INSECURE_HTTP: blankAsUnset(
      z.enum(['true', 'false']).default('false')
    ),
    MCP_HOST: z.string().default('127.0.0.1'),
    MCP_PORT: z.coerce.number().int().min(0).max(65_535).default(3000),
    MCP_ALLOWED_HOSTS: blankAsUnset(z.string().optional()),
    MCP_CLIENT_TOKEN: blankAsUnset(
      z
        .string()
        .min(16, 'MCP_CLIENT_TOKEN must be at least 16 characters.')
        .optional()
    ),
    MCP_CLIENTS: blankAsUnset(z.string().optional()),
    MCP_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(120),
    LOG_LEVEL: blankAsUnset(LogLevelSchema.default('info'))
  })
  .superRefine((env, ctx) => {
    const url = new URL(env.WOO_BASE_URL);
    const isLocal = LOCAL_HOSTNAMES.includes(url.hostname);

    if (
      url.protocol === 'http:' &&
      !isLocal &&
      env.WOO_ALLOW_INSECURE_HTTP !== 'true'
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['WOO_BASE_URL'],
        message:
          'Store credentials must not travel over plain HTTP. Use https:// or set WOO_ALLOW_INSECURE_HTTP=true for a local mock.'
      });
    }

    if (!env.MCP_CLIENT_TOKEN && !env.MCP_CLIENTS) {
      ctx.addIssue({
        code: 'custom',
        path: ['MCP_CLIENT_TOKEN'],
        message: 'Set MCP_CLIENT_TOKEN, or MCP_CLIENTS for several clients.'
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(env: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
    );

    throw new Error(`Invalid server configuration:\n${problems.join('\n')}`);
  }

  return parsed.data;
}
