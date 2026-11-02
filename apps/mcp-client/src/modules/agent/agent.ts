import { parseToolError } from '@woocommerce-mcp/shared';

import { describeError } from '@/core/error/classify-error';
import { toLlmTool, formatToolResultForLlm } from '@/modules/llm/tool-adapter';

import type { Conversation } from '@/modules/conversation/conversation';
import type { ApprovalPolicy } from '@/modules/approval/approval-policy';
import type { LlmProvider, ToolCallRequest } from '@/modules/llm/llm.types';
import type {
  Approver,
  ApprovalLevel
} from '@/modules/approval/approval.types';
import type {
  AgentEvent,
  AgentResult,
  AgentToolCall
} from '@/modules/agent/agent.types';
import type {
  RegisteredTool,
  ServerRegistry
} from '@/modules/connection/server-registry';

export interface AgentOptions {
  llm: LlmProvider;
  approver: Approver;
  policy: ApprovalPolicy;
  registry: ServerRegistry;
  maxSteps?: number;
  onEvent?: (event: AgentEvent) => void;
}

interface ExecutedCall {
  content: string;
  record: AgentToolCall;
}

const DEFAULT_MAX_STEPS = 8;

// approval is enforced here, outside the model: a call is a request.
// calls in one turn run in order, so approvals come one at a time.
export class Agent {
  constructor(private readonly options: AgentOptions) {}

  async run(
    conversation: Conversation,
    userMessage: string,
    signal?: AbortSignal
  ): Promise<AgentResult> {
    const maxSteps = this.options.maxSteps ?? DEFAULT_MAX_STEPS;
    const toolCalls: AgentToolCall[] = [];

    conversation.push({ role: 'user', content: userMessage });

    for (let step = 1; step <= maxSteps; step++) {
      this.emit({ type: 'thinking', step });

      const tools = this.options.registry
        .tools()
        .map((entry) => toLlmTool(entry));
      const response = await this.options.llm.complete(
        conversation.messages,
        tools,
        signal
      );

      conversation.push({
        role: 'assistant',
        content: response.content,
        ...(response.toolCalls.length ? { toolCalls: response.toolCalls } : {})
      });

      if (response.toolCalls.length === 0) {
        const text = response.content?.trim() || '(no response)';

        this.emit({ type: 'final', text });

        return { text, steps: step, toolCalls, stoppedReason: 'final' };
      }

      for (const call of response.toolCalls) {
        const executed = await this.execute(call, signal);

        toolCalls.push(executed.record);
        conversation.push({
          role: 'tool',
          toolCallId: call.id,
          content: executed.content
        });
      }
    }

    const text = `I stopped after ${maxSteps} steps without reaching an answer. Try a narrower request.`;

    this.emit({ type: 'final', text });

    return { text, steps: maxSteps, toolCalls, stoppedReason: 'max_steps' };
  }

  private async execute(
    call: ToolCallRequest,
    signal?: AbortSignal
  ): Promise<ExecutedCall> {
    const args = this.parseArguments(call.arguments);

    if (!args) {
      return this.rejected(
        call.name,
        {},
        'invalid',
        "TOOL ERROR: invalid arguments JSON. Send a JSON object matching the tool's schema."
      );
    }

    const entry = this.options.registry.resolveTool(call.name);

    if (!entry) {
      return this.rejected(
        call.name,
        args,
        'invalid',
        `TOOL ERROR: there is no tool named "${call.name}". Use one of the tools provided.`
      );
    }

    this.emit({ type: 'tool_call', name: call.name, args });

    const level = this.options.policy.evaluate({
      server: entry.server,
      tool: entry.tool.name,
      args,
      annotations: entry.tool.annotations
    });
    const refusal = await this.checkApproval(entry, args, level);

    if (refusal) return this.rejected(call.name, args, 'declined', refusal);

    return await this.callTool(entry, args, level, signal);
  }

  private async checkApproval(
    entry: RegisteredTool,
    args: Record<string, unknown>,
    level: ApprovalLevel
  ): Promise<string | undefined> {
    if (level === 'auto') return undefined;

    if (level === 'deny') {
      this.emit({
        type: 'approval',
        name: entry.qualifiedName,
        level,
        isApproved: false
      });

      return 'NOT EXECUTED: this host does not allow this operation. Do not retry it.';
    }

    const request = {
      server: entry.server,
      tool: entry.tool.name,
      args,
      annotations: entry.tool.annotations
    };
    const decision = await this.options.approver.approve(request, level);

    this.emit({
      type: 'approval',
      name: entry.qualifiedName,
      level,
      isApproved: decision.isApproved
    });

    if (decision.isApproved) return undefined;

    return `NOT EXECUTED: the user declined this operation (${decision.reason ?? 'no reason given'}). Do not retry it; ask the user how they want to proceed.`;
  }

  private async callTool(
    entry: RegisteredTool,
    args: Record<string, unknown>,
    level: ApprovalLevel,
    signal?: AbortSignal
  ): Promise<ExecutedCall> {
    const name = entry.qualifiedName;
    const started = performance.now();
    const elapsed = () => Math.round(performance.now() - started);

    try {
      const result = await this.options.registry.callTool(name, args, {
        ...(signal ? { signal } : {}),
        shouldRetryOnDisconnect:
          entry.tool.annotations?.readOnlyHint === true && level === 'auto',
        onProgress: (progress) => {
          this.emit({
            type: 'progress',
            name,
            progress: progress.progress,
            total: progress.total,
            message: progress.message
          });
        }
      });

      const errorCode = result.isError
        ? parseToolError(result.structuredContent)?.code
        : undefined;

      this.emit({
        type: 'tool_result',
        name,
        isError: !!result.isError,
        errorCode,
        durationMs: elapsed()
      });

      return {
        content: formatToolResultForLlm(result),
        record: { name, args, outcome: result.isError ? 'error' : 'ok' }
      };
    } catch (error) {
      // a protocol or transport failure leaves no tool result for the model.
      this.emit({
        type: 'tool_result',
        name,
        isError: true,
        errorCode: 'TRANSPORT',
        durationMs: elapsed()
      });

      return {
        content: `TOOL ERROR: the call failed before producing a result (${describeError(error)}).`,
        record: { name, args, outcome: 'error' }
      };
    }
  }

  private parseArguments(text: string): Record<string, unknown> | undefined {
    try {
      const parsed: unknown = JSON.parse(text || '{}');

      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : undefined;
    } catch {
      return undefined;
    }
  }

  private rejected(
    name: string,
    args: Record<string, unknown>,
    outcome: AgentToolCall['outcome'],
    content: string
  ): ExecutedCall {
    return { content, record: { name, args, outcome } };
  }

  private emit(event: AgentEvent): void {
    this.options.onEvent?.(event);
  }
}
