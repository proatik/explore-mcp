import type { ToolAnnotations } from '@modelcontextprotocol/client';

// confirm asks y/N; explicit makes the person type the tool name.
export type ApprovalLevel = 'auto' | 'confirm' | 'explicit' | 'deny';

export type HumanApprovalLevel = Exclude<ApprovalLevel, 'auto' | 'deny'>;

export type ApprovalRule =
  ApprovalLevel | ((args: Record<string, unknown>) => ApprovalLevel);

export interface ApprovalRequest {
  server: string;
  tool: string;
  args: Record<string, unknown>;
  annotations?: ToolAnnotations | undefined;
}

export interface ApprovalDecision {
  isApproved: boolean;
  reason?: string;
}

export interface Approver {
  approve(
    request: ApprovalRequest,
    level: HumanApprovalLevel
  ): Promise<ApprovalDecision>;
}
