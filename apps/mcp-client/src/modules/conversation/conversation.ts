import { MAX_CONVERSATION_MESSAGES } from '@/modules/conversation/conversation.constants';

import type { ChatMessage } from '@/modules/llm/llm.types';

export class Conversation {
  private history: ChatMessage[] = [];

  constructor(
    private readonly systemPrompt: string,
    private readonly maxMessages = MAX_CONVERSATION_MESSAGES
  ) {}

  get messages(): ChatMessage[] {
    return [{ role: 'system', content: this.systemPrompt }, ...this.history];
  }

  push(...messages: ChatMessage[]): void {
    this.history.push(...messages);

    this.trim();
  }

  clear(): void {
    this.history = [];
  }

  // restarts at a user message, so a tool call never loses its tool results.
  private trim(): void {
    if (this.history.length <= this.maxMessages) return;

    let start = this.history.length - this.maxMessages;

    while (start < this.history.length && this.history[start]?.role !== 'user')
      start++;

    this.history = this.history.slice(start);
  }
}
