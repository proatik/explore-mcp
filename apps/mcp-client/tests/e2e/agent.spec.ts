import { it, expect, describe, afterAll, beforeAll, afterEach } from 'vitest';

import { Agent } from '@/modules/agent/agent';
import { TOKENS, startTestStack } from '../support/test-stack';
import { Conversation } from '@/modules/conversation/conversation';
import { ApprovalPolicy } from '@/modules/approval/approval-policy';
import { StaticApprover } from '@/modules/approval/static-approver';
import { McpConnection } from '@/modules/connection/mcp-connection';
import { ServerRegistry } from '@/modules/connection/server-registry';
import { DEFAULT_SYSTEM_PROMPT } from '@/modules/conversation/conversation.constants';
import {
  say,
  callTools,
  lastToolResult,
  ScriptedProvider
} from '@/modules/llm/scripted-provider';

import type { TestStack } from '../support/test-stack';
import type { AgentEvent } from '@/modules/agent/agent.types';

// each script step reads the conversation so far, as a real model would.
let stack: TestStack;
let registry: ServerRegistry;

beforeAll(async () => {
  stack = await startTestStack();
  registry = new ServerRegistry().add(
    new McpConnection({
      name: 'woocommerce',
      url: stack.server.mcpUrl,
      token: TOKENS.ops
    })
  );

  await registry.refresh();
});

afterEach(() => {
  stack.store.reset();
});

afterAll(async () => {
  await registry.closeAll();

  await stack.close();
});

function createAgent(llm: ScriptedProvider, shouldApprove: boolean) {
  const events: AgentEvent[] = [];
  const approver = new StaticApprover(shouldApprove);
  const agent = new Agent({
    llm,
    registry,
    approver,
    policy: new ApprovalPolicy(),
    onEvent: (event) => events.push(event)
  });

  return { agent, events, approver };
}

describe('agent end to end', () => {
  it('answers a read question by calling a discovered tool', async () => {
    const llm = new ScriptedProvider([
      callTools({
        name: 'get_stock_status',
        args: { threshold: 4, includeOutOfStock: false }
      }),
      ({ messages, tools }) => {
        const result = lastToolResult(messages) as {
          products: Array<{ name: string; stockQuantity: number }>;
        };
        const lines = result.products.map(
          (product) => `${product.name} (${product.stockQuantity})`
        );

        return say(`Low stock: ${lines.join(', ')}`)({ messages, tools });
      }
    ]);

    const { agent, events, approver } = createAgent(llm, false);
    const result = await agent.run(
      new Conversation(DEFAULT_SYSTEM_PROMPT),
      'Which products have fewer than 5 units left?'
    );

    expect(result.text).toBe(
      'Low stock: Beeswax Pillar Candles (1), Brass Task Lamp (2), Walnut Serving Board (3), Merino Throw Blanket (4)'
    );
    expect(result.toolCalls).toEqual([
      {
        name: 'get_stock_status',
        args: { threshold: 4, includeOutOfStock: false },
        outcome: 'ok'
      }
    ]);
    expect(approver.requests).toHaveLength(0);
    expect(events.some((event) => event.type === 'progress')).toBe(true);
    expect(llm.calls[0]?.tools.map((tool) => tool.name)).toContain(
      'update_stock_quantity'
    );
    expect(llm.calls[0]?.messages[0]).toMatchObject({ role: 'system' });
  });

  it('chains several tool calls before answering', async () => {
    const llm = new ScriptedProvider([
      callTools({ name: 'list_orders', args: { status: ['on-hold'] } }),
      ({ messages, tools }) => {
        const page = lastToolResult(messages) as {
          items: Array<{ id: number }>;
        };

        return callTools({
          name: 'get_order',
          args: { orderId: page.items[0]?.id }
        })({ messages, tools });
      },
      ({ messages, tools }) => {
        const order = lastToolResult(messages) as {
          number: string;
          customerNote: string;
        };

        return say(
          `Order #${order.number} is on hold. Customer note: "${order.customerNote}"`
        )({ messages, tools });
      }
    ]);

    const result = await createAgent(llm, false).agent.run(
      new Conversation(''),
      'Anything on hold?'
    );

    expect(result.steps).toBe(3);
    expect(result.text).toBe(
      'Order #5004 is on hold. Customer note: "Could you wrap the pen as a gift?"'
    );
  });

  it('runs a write only after human approval', async () => {
    const llm = new ScriptedProvider([
      callTools({
        name: 'update_stock_quantity',
        args: {
          productId: 109,
          operation: 'increment',
          quantity: 24,
          reason: 'Delivery received'
        }
      }),
      say('Restocked the beeswax candles to 25.')
    ]);

    const { agent, approver, events } = createAgent(llm, true);
    const result = await agent.run(
      new Conversation(''),
      'We got 24 candles in, update stock.'
    );

    expect(approver.requests).toEqual([
      expect.objectContaining({
        tool: 'update_stock_quantity',
        level: 'confirm'
      })
    ]);
    expect(events).toContainEqual({
      type: 'approval',
      name: 'update_stock_quantity',
      level: 'confirm',
      isApproved: true
    });
    expect(result.toolCalls[0]?.outcome).toBe('ok');
    expect(
      stack.store.state.products.find((product) => product.id === 109)
        ?.stock_quantity
    ).toBe(25);
  });

  it('leaves the store untouched when approval is declined, and tells the model', async () => {
    const llm = new ScriptedProvider([
      callTools({
        name: 'delete_product',
        args: { productId: 101, confirmSku: 'KIT-POUR-01' }
      }),
      ({ messages, tools }) =>
        say(String(lastToolResult(messages)))({ messages, tools })
    ]);

    const { agent, approver } = createAgent(llm, false);
    const result = await agent.run(
      new Conversation(''),
      'Delete the pour-over set.'
    );

    expect(approver.requests[0]).toMatchObject({
      tool: 'delete_product',
      level: 'explicit'
    });
    expect(result.toolCalls[0]?.outcome).toBe('declined');
    expect(result.text).toMatch(/^NOT EXECUTED: the user declined/);
    expect(
      stack.store.state.products.some((product) => product.id === 101)
    ).toBe(true);
    expect(
      stack.store.requests.some((entry) => entry.method === 'DELETE')
    ).toBe(false);
  });

  it('feeds business errors back to the model instead of failing the run', async () => {
    const llm = new ScriptedProvider([
      callTools({
        name: 'update_order_status',
        args: { orderId: 5001, status: 'pending' }
      }),
      ({ messages, tools }) =>
        say(String(lastToolResult(messages)))({ messages, tools })
    ]);

    const result = await createAgent(llm, true).agent.run(
      new Conversation(''),
      'Reopen order 5001'
    );

    expect(result.toolCalls[0]?.outcome).toBe('error');
    expect(result.text).toMatch(/^TOOL ERROR: .*INVALID_TRANSITION/);
  });

  it('handles hallucinated tools and malformed arguments', async () => {
    const llm = new ScriptedProvider([
      () => ({
        content: null,
        toolCalls: [
          { id: 'a', name: 'refund_everything', arguments: '{}' },
          { id: 'b', name: 'get_product', arguments: '{not json' }
        ]
      }),
      say('Sorry, I could not do that.')
    ]);

    const result = await createAgent(llm, true).agent.run(
      new Conversation(''),
      'Do something odd'
    );
    const toolMessages = (llm.calls[1]?.messages ?? []).flatMap((message) =>
      message.role === 'tool' ? [message.content] : []
    );

    expect(result.toolCalls.map((call) => call.outcome)).toEqual([
      'invalid',
      'invalid'
    ]);
    expect(toolMessages[0]).toMatch(/no tool named "refund_everything"/);
    expect(toolMessages[1]).toMatch(/invalid arguments JSON/);
  });

  it('stops at the step budget', async () => {
    const loop = callTools({ name: 'list_products', args: {} });
    const llm = new ScriptedProvider([loop, loop, loop]);
    const agent = new Agent({
      llm,
      registry,
      policy: new ApprovalPolicy(),
      approver: new StaticApprover(true),
      maxSteps: 3
    });
    const result = await agent.run(new Conversation(''), 'Loop forever');

    expect(result.stoppedReason).toBe('max_steps');
    expect(result.toolCalls).toHaveLength(3);
  });
});
