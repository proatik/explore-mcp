import type { ApprovalLevel } from '@/modules/approval/approval.types';

export type AgentEvent =
  | { type: 'thinking'; step: number }
  | { type: 'tool_call'; name: string; args: Record<string, unknown> }
  | {
      type: 'approval';
      name: string;
      level: ApprovalLevel;
      isApproved: boolean;
    }
  | {
      type: 'tool_result';
      name: string;
      isError: boolean;
      errorCode?: string | undefined;
      durationMs: number;
    }
  | {
      type: 'progress';
      name: string;
      progress: number;
      total?: number | undefined;
      message?: string | undefined;
    }
  | { type: 'final'; text: string };

export type ToolCallOutcome = 'ok' | 'error' | 'declined' | 'invalid';

export interface AgentToolCall {
  name: string;
  args: Record<string, unknown>;
  outcome: ToolCallOutcome;
}

export interface AgentResult {
  text: string;
  steps: number;
  toolCalls: AgentToolCall[];
  stoppedReason: 'final' | 'max_steps';
}
