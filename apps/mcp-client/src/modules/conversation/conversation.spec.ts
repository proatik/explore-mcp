import { it, expect, describe } from 'vitest';

import { Conversation } from '@/modules/conversation/conversation';

describe('Conversation', () => {
  it('always starts with the system prompt', () => {
    const conversation = new Conversation('system rules');

    conversation.push({ role: 'user', content: 'hi' });

    expect(conversation.messages[0]).toEqual({
      role: 'system',
      content: 'system rules'
    });
  });

  it('trims old turns without orphaning tool results', () => {
    const conversation = new Conversation('s', 4);

    conversation.push({ role: 'user', content: 'q1' });
    conversation.push({
      role: 'assistant',
      content: null,
      toolCalls: [{ id: '1', name: 't', arguments: '{}' }]
    });
    conversation.push({ role: 'tool', toolCallId: '1', content: 'r' });
    conversation.push({ role: 'assistant', content: 'a1' });
    conversation.push({ role: 'user', content: 'q2' });

    expect(conversation.messages.slice(1)).toEqual([
      { role: 'user', content: 'q2' }
    ]);
  });
});
