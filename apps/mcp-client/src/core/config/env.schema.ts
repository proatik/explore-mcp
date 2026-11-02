import { z } from 'zod';

import { blankAsUnset, LogLevelSchema } from '@woocommerce-mcp/shared';

export const ServerEntrySchema = z.object({
  name: z
    .string()
    .regex(
      /^[a-z][a-z0-9-]{0,20}$/,
      'Use lowercase letters, digits and dashes.'
    ),
  url: z.url(),
  token: z.string().optional()
});

export type ServerEntry = z.infer<typeof ServerEntrySchema>;

export const envSchema = z.object({
  CLIENT_HOST: z.string().default('127.0.0.1'),
  CLIENT_PORT: z.coerce.number().int().min(0).max(65_535).default(4000),
  MCP_SERVER_URL: blankAsUnset(z.url().default('http://127.0.0.1:3000/mcp')),
  MCP_CLIENT_TOKEN: blankAsUnset(z.string().optional()),
  MCP_EXTRA_SERVERS: blankAsUnset(z.string().optional()),
  MCP_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30_000),
  OPENAI_API_KEY: blankAsUnset(z.string().optional()),
  OPENAI_MODEL: blankAsUnset(z.string().default('gpt-5-mini')),
  OPENAI_BASE_URL: blankAsUnset(z.url().optional()),
  AGENT_MAX_STEPS: z.coerce.number().int().min(1).max(30).default(8),
  LOG_LEVEL: blankAsUnset(LogLevelSchema.default('info'))
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(env: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
    );

    throw new Error(`Invalid client configuration:\n${problems.join('\n')}`);
  }

  return parsed.data;
}
