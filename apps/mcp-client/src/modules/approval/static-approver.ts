import type {
  Approver,
  ApprovalRequest,
  ApprovalDecision,
  HumanApprovalLevel
} from '@/modules/approval/approval.types';

export type RecordedApproval = ApprovalRequest & { level: HumanApprovalLevel };

export class StaticApprover implements Approver {
  readonly requests: RecordedApproval[] = [];

  constructor(private readonly shouldApprove: boolean) {}

  async approve(
    request: ApprovalRequest,
    level: HumanApprovalLevel
  ): Promise<ApprovalDecision> {
    this.requests.push({ ...request, level });

    return this.shouldApprove
      ? { isApproved: true }
      : { isApproved: false, reason: 'declined by policy' };
  }
}
