import { ToolErrorSchema } from './schemas/tool-error.schema';

import type { ToolErrorPayload } from './schemas/tool-error.schema';

export function parseToolError(
  structuredContent: unknown
): ToolErrorPayload['error'] | undefined {
  const parsed = ToolErrorSchema.safeParse(structuredContent);

  return parsed.success ? parsed.data.error : undefined;
}
