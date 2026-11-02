export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

export const MAX_TOOL_RESULT_CHARS = 16_000;

export const MAX_TOOL_DESCRIPTION_CHARS = 1_024;

/**
 * 1. 'MAX_TOOL_RESULT_CHARS' keeps one tool call from filling the context window.
 * 2. 'MAX_TOOL_DESCRIPTION_CHARS' is the openai function description limit.
 */
