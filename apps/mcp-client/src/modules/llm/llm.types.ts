export interface ToolCallRequest {
  id: string;
  name: string;
  // raw JSON text from the model; it may be invalid and is checked by the agent.
  arguments: string;
}

export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; toolCalls?: ToolCallRequest[] }
  | { role: 'tool'; toolCallId: string; content: string };

export interface LlmTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LlmResponse {
  content: string | null;
  toolCalls: ToolCallRequest[];
  usage?: { inputTokens: number; outputTokens: number };
}

export interface LlmProvider {
  readonly name: string;
  complete(
    messages: ChatMessage[],
    tools: LlmTool[],
    signal?: AbortSignal
  ): Promise<LlmResponse>;
}
