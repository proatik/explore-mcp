import {
  MAX_TOOL_RESULT_CHARS,
  MAX_TOOL_DESCRIPTION_CHARS
} from '@/modules/llm/llm.constants';

import type { LlmTool } from '@/modules/llm/llm.types';
import type { RegisteredTool } from '@/modules/connection/server-registry';
import type {
  ContentBlock,
  CallToolResult
} from '@modelcontextprotocol/client';

export function toLlmTool(entry: RegisteredTool): LlmTool {
  const { tool } = entry;
  const hints = [
    tool.annotations?.readOnlyHint ? 'read-only' : '',
    tool.annotations?.destructiveHint ? 'destructive' : ''
  ].filter(Boolean);

  const title = tool.title && tool.title !== tool.name ? `${tool.title}.` : '';
  const description = [
    title,
    tool.description ?? '',
    hints.length ? `[${hints.join(', ')}]` : ''
  ]
    .filter(Boolean)
    .join(' ');

  return {
    name: entry.qualifiedName,
    description: description.slice(0, MAX_TOOL_DESCRIPTION_CHARS),
    parameters: { ...tool.inputSchema, type: 'object' }
  };
}

// structured content is preferred: compact, and unambiguous for the model.
export function formatToolResultForLlm(result: CallToolResult): string {
  const body =
    result.structuredContent === undefined
      ? result.content.map((block) => contentToText(block)).join('\n')
      : JSON.stringify(result.structuredContent);

  const overflow = body.length - MAX_TOOL_RESULT_CHARS;
  const text =
    overflow > 0
      ? `${body.slice(0, MAX_TOOL_RESULT_CHARS)}… [truncated ${overflow} characters]`
      : body;

  return result.isError ? `TOOL ERROR: ${text}` : text;
}

function contentToText(block: ContentBlock): string {
  if (block.type === 'text') return block.text;

  if (block.type === 'resource' && 'text' in block.resource)
    return block.resource.text;

  return `[${block.type} content]`;
}
