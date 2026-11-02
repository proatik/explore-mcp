import OpenAI from 'openai';

import type {
  LlmTool,
  ChatMessage,
  LlmProvider,
  LlmResponse
} from '@/modules/llm/llm.types';
import type {
  ChatCompletionTool,
  ChatCompletionMessageParam
} from 'openai/resources/chat/completions';

export interface OpenAIProviderOptions {
  apiKey: string;
  model: string;
  baseUrl?: string | undefined;
}

export class OpenAIProvider implements LlmProvider {
  readonly name: string;

  private readonly client: OpenAI;

  constructor(private readonly options: OpenAIProviderOptions) {
    this.name = `openai:${options.model}`;
    this.client = new OpenAI({
      apiKey: options.apiKey,
      ...(options.baseUrl ? { baseURL: options.baseUrl } : {})
    });
  }

  async complete(
    messages: ChatMessage[],
    tools: LlmTool[],
    signal?: AbortSignal
  ): Promise<LlmResponse> {
    const response = await this.client.chat.completions.create(
      {
        model: this.options.model,
        messages: messages.map((message) => this.toOpenAIMessage(message)),
        ...(tools.length
          ? {
              tools: tools.map((tool) => this.toOpenAITool(tool)),
              tool_choice: 'auto' as const,
              parallel_tool_calls: true
            }
          : {})
      },
      signal ? { signal } : {}
    );

    const message = response.choices[0]?.message;
    const toolCalls = (message?.tool_calls ?? []).flatMap((call) =>
      call.type === 'function'
        ? [
            {
              id: call.id,
              name: call.function.name,
              arguments: call.function.arguments
            }
          ]
        : []
    );

    return {
      content: message?.content ?? null,
      toolCalls,
      ...(response.usage
        ? {
            usage: {
              inputTokens: response.usage.prompt_tokens,
              outputTokens: response.usage.completion_tokens
            }
          }
        : {})
    };
  }

  private toOpenAITool(tool: LlmTool): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    };
  }

  private toOpenAIMessage(message: ChatMessage): ChatCompletionMessageParam {
    switch (message.role) {
      case 'system':
      case 'user':
        return { role: message.role, content: message.content };
      case 'tool':
        return {
          role: 'tool',
          tool_call_id: message.toolCallId,
          content: message.content
        };
      case 'assistant':
        return {
          role: 'assistant',
          content: message.content,
          ...(message.toolCalls?.length
            ? {
                tool_calls: message.toolCalls.map((call) => ({
                  id: call.id,
                  type: 'function' as const,
                  function: { name: call.name, arguments: call.arguments }
                }))
              }
            : {})
        };
    }
  }
}
