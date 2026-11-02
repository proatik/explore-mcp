import type {
  LlmTool,
  ChatMessage,
  LlmProvider,
  LlmResponse
} from '@/modules/llm/llm.types';

export type ScriptStep = (context: {
  messages: ChatMessage[];
  tools: LlmTool[];
}) => LlmResponse;

export interface ScriptedCall {
  messages: ChatMessage[];
  tools: LlmTool[];
}

export class ScriptedProvider implements LlmProvider {
  readonly name = 'scripted';
  readonly calls: ScriptedCall[] = [];

  private readonly steps: ScriptStep[];

  constructor(steps: ScriptStep[]) {
    this.steps = [...steps];
  }

  async complete(
    messages: ChatMessage[],
    tools: LlmTool[]
  ): Promise<LlmResponse> {
    this.calls.push({ messages: structuredClone(messages), tools });

    const step = this.steps.shift();

    if (!step) throw new Error('The scripted provider ran out of steps.');

    return step({ messages, tools });
  }
}

let nextCallId = 0;

export function say(content: string): ScriptStep {
  return () => ({ content, toolCalls: [] });
}

export function callTools(
  ...calls: Array<{ name: string; args: Record<string, unknown> }>
): ScriptStep {
  return () => ({
    content: null,
    toolCalls: calls.map((call) => ({
      id: `call_${++nextCallId}`,
      name: call.name,
      arguments: JSON.stringify(call.args)
    }))
  });
}

export function lastToolResult(messages: ChatMessage[]): unknown {
  const last = messages.findLast((message) => message.role === 'tool');

  if (last?.role !== 'tool') return undefined;

  try {
    return JSON.parse(last.content) as unknown;
  } catch {
    return last.content;
  }
}
