import { it, expect, describe, afterAll, beforeAll, afterEach } from 'vitest';

import { startClient } from '@/bootstrap/start-client';
import { TOKENS, startTestStack } from '../support/test-stack';
import {
  say,
  callTools,
  ScriptedProvider
} from '@/modules/llm/scripted-provider';

import type { TestStack } from '../support/test-stack';
import type { ChatEvent } from '@/modules/chat/chat.types';
import type { LlmProvider } from '@/modules/llm/llm.types';
import type { RunningClient } from '@/bootstrap/start-client';

let stack: TestStack;
let client: RunningClient | undefined;

beforeAll(async () => {
  stack = await startTestStack();
});

afterEach(async () => {
  await client?.close();

  client = undefined;
  stack.store.reset();
});

afterAll(async () => {
  await stack.close();
});

function env(): Record<string, string> {
  return {
    CLIENT_PORT: '0',
    MCP_SERVER_URL: stack.server.mcpUrl,
    MCP_CLIENT_TOKEN: TOKENS.ops,
    MCP_REQUEST_TIMEOUT_MS: '10000',
    AGENT_MAX_STEPS: '5',
    LOG_LEVEL: 'silent'
  };
}

async function startWith(llm?: LlmProvider): Promise<RunningClient> {
  client = await startClient(env(), llm);

  return client;
}

async function post(
  url: string,
  body?: unknown
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });

  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>
  };
}

async function openEvents(url: string): Promise<{
  events: ChatEvent[];
  until: (type: string) => Promise<ChatEvent>;
}> {
  const response = await fetch(url);
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  const events: ChatEvent[] = [];
  let buffer = '';

  const pump = async (): Promise<void> => {
    while (reader) {
      const chunk = await reader.read();

      if (chunk.done) return;

      buffer += decoder.decode(chunk.value, { stream: true });

      const frames = buffer.split('\n\n');

      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const data = frame
          .split('\n')
          .find((line) => line.startsWith('data: '));

        if (data) events.push(JSON.parse(data.slice(6)) as ChatEvent);
      }
    }
  };

  void pump().catch(() => undefined);

  const until = async (type: string): Promise<ChatEvent> => {
    await expect
      .poll(() => events.some((event) => event.type === type), {
        timeout: 10_000
      })
      .toBe(true);

    return events.find((event) => event.type === type) as ChatEvent;
  };

  return { events, until };
}

describe('chat API', () => {
  it('reports the connected server, the model and each tool approval level', async () => {
    const app = await startWith(new ScriptedProvider([]));
    const status = (await (await fetch(`${app.url}/api/status`)).json()) as {
      model: string;
      servers: Array<{ state: string; tools: number }>;
      tools: Array<{ name: string; approval: string }>;
    };

    expect(status.model).toBe('scripted');
    expect(status.servers).toEqual([
      expect.objectContaining({ state: 'connected', tools: 12 })
    ]);
    expect(status.tools).toEqual(
      expect.arrayContaining([
        { name: 'list_products', title: 'List products', approval: 'auto' },
        {
          name: 'delete_product',
          title: 'Delete product',
          approval: 'explicit'
        }
      ])
    );
  });

  it('serves the chat page', async () => {
    const app = await startWith(new ScriptedProvider([]));
    const page = await fetch(app.url);

    expect(page.status).toBe(200);
    expect(await page.text()).toContain('WooCommerce Agent');
  });

  it('streams a run and waits for approval before writing to the store', async () => {
    const llm = new ScriptedProvider([
      callTools({
        name: 'update_stock_quantity',
        args: {
          productId: 109,
          operation: 'increment',
          quantity: 24,
          reason: 'Delivery'
        }
      }),
      say('Restocked the candles.')
    ]);
    const app = await startWith(llm);
    const session = await post(`${app.url}/api/sessions`);
    const sessionId = String(session.body.sessionId);
    const stream = await openEvents(
      `${app.url}/api/sessions/${sessionId}/events`
    );

    expect(session.status).toBe(201);

    const accepted = await post(
      `${app.url}/api/sessions/${sessionId}/messages`,
      { text: 'We got 24 candles.' }
    );

    expect(accepted).toEqual({
      status: 200,
      body: { message: 'Message accepted.' }
    });

    const approval = await stream.until('approval_required');

    expect(approval).toMatchObject({
      tool: 'update_stock_quantity',
      level: 'confirm',
      args: { quantity: 24 }
    });
    expect(
      stack.store.state.products.find((product) => product.id === 109)
        ?.stock_quantity
    ).toBe(1);

    const busy = await post(`${app.url}/api/sessions/${sessionId}/messages`, {
      text: 'Hurry up.'
    });

    expect(busy.status).toBe(409);

    const approvalId =
      approval.type === 'approval_required' ? approval.approvalId : '';
    const answer = await post(
      `${app.url}/api/sessions/${sessionId}/approvals/${approvalId}`,
      { isApproved: true }
    );

    expect(answer).toEqual({
      status: 200,
      body: { message: 'Operation approved.' }
    });

    await expect(stream.until('final')).resolves.toMatchObject({
      text: 'Restocked the candles.'
    });
    expect(
      stack.store.state.products.find((product) => product.id === 109)
        ?.stock_quantity
    ).toBe(25);

    const again = await post(
      `${app.url}/api/sessions/${sessionId}/approvals/${approvalId}`,
      { isApproved: true }
    );

    expect(again.status).toBe(404);
  });

  it('refuses to chat without a model, and rejects malformed input', async () => {
    const app = await startWith();
    const session = await post(`${app.url}/api/sessions`);
    const sessionId = String(session.body.sessionId);

    const noModel = await post(
      `${app.url}/api/sessions/${sessionId}/messages`,
      { text: 'Hello' }
    );
    const empty = await post(`${app.url}/api/sessions/${sessionId}/messages`, {
      text: ''
    });
    const unknown = await post(`${app.url}/api/sessions/nope/messages`, {
      text: 'Hello'
    });

    expect(noModel.status).toBe(503);
    expect(noModel.body.message).toMatch(/OPENAI_API_KEY/);
    expect(empty.status).toBe(400);
    expect(unknown.status).toBe(404);
  });
});
