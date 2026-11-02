import { it, expect, describe } from 'vitest';

import { toLlmTool, formatToolResultForLlm } from '@/modules/llm/tool-adapter';

describe('toLlmTool', () => {
  it('turns an MCP tool into a function definition, keeping its JSON Schema', () => {
    const llmTool = toLlmTool({
      qualifiedName: 'woocommerce__get_product',
      server: 'woocommerce',
      tool: {
        name: 'get_product',
        title: 'Get product',
        description: 'Get one product by ID.',
        inputSchema: {
          type: 'object',
          properties: { productId: { type: 'integer' } },
          required: ['productId']
        },
        annotations: { readOnlyHint: true }
      }
    });

    expect(llmTool.name).toBe('woocommerce__get_product');
    expect(llmTool.description).toBe(
      'Get product. Get one product by ID. [read-only]'
    );
    expect(llmTool.parameters).toMatchObject({
      type: 'object',
      required: ['productId']
    });
  });
});

describe('formatToolResultForLlm', () => {
  it('prefers structured content and labels errors', () => {
    const structured = formatToolResultForLlm({
      content: [{ type: 'text', text: 'ignored' }],
      structuredContent: { a: 1 }
    });
    const failure = formatToolResultForLlm({
      content: [{ type: 'text', text: 'NOT_FOUND: gone' }],
      isError: true
    });

    expect(structured).toBe('{"a":1}');
    expect(failure).toBe('TOOL ERROR: NOT_FOUND: gone');
  });

  it('truncates very large results', () => {
    const text = formatToolResultForLlm({
      content: [{ type: 'text', text: 'x'.repeat(20_000) }]
    });

    expect(text.length).toBeLessThan(16_100);
    expect(text).toMatch(/truncated/);
  });
});
