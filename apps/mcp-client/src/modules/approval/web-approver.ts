import { randomUUID } from 'node:crypto';

import type {
  Approver,
  ApprovalRequest,
  ApprovalDecision,
  HumanApprovalLevel
} from '@/modules/approval/approval.types';

export interface PendingApproval extends ApprovalRequest {
  approvalId: string;
  level: HumanApprovalLevel;
}

interface Waiter {
  resolve: (decision: ApprovalDecision) => void;
  timer: NodeJS.Timeout;
}

const DEFAULT_APPROVAL_TIMEOUT_MS = 5 * 60_000;

// the agent waits here until a person answers on the page, or time runs out.
export class WebApprover implements Approver {
  private readonly waiters = new Map<string, Waiter>();

  constructor(
    private readonly onRequest: (pending: PendingApproval) => void,
    private readonly timeoutMs = DEFAULT_APPROVAL_TIMEOUT_MS
  ) {}

  async approve(
    request: ApprovalRequest,
    level: HumanApprovalLevel
  ): Promise<ApprovalDecision> {
    const approvalId = randomUUID();

    return await new Promise<ApprovalDecision>((resolve) => {
      const timer = setTimeout(() => {
        this.settle(approvalId, {
          isApproved: false,
          reason: 'no answer in time'
        });
      }, this.timeoutMs);

      this.waiters.set(approvalId, { resolve, timer });
      this.onRequest({ ...request, approvalId, level });
    });
  }

  // returns false when the approval is unknown or was already answered.
  answer(approvalId: string, isApproved: boolean): boolean {
    return this.settle(
      approvalId,
      isApproved
        ? { isApproved: true }
        : { isApproved: false, reason: 'declined' }
    );
  }

  declineAll(): void {
    for (const approvalId of this.waiters.keys()) {
      this.settle(approvalId, { isApproved: false, reason: 'session closed' });
    }
  }

  private settle(approvalId: string, decision: ApprovalDecision): boolean {
    const waiter = this.waiters.get(approvalId);

    if (!waiter) return false;

    clearTimeout(waiter.timer);
    this.waiters.delete(approvalId);
    waiter.resolve(decision);

    return true;
  }
}
