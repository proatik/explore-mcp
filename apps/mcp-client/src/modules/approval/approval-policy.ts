import { DEFAULT_APPROVAL_RULES } from '@/modules/approval/approval.constants';

import type {
  ApprovalRule,
  ApprovalLevel,
  ApprovalRequest
} from '@/modules/approval/approval.types';

// server annotations are untrusted hints: they can raise a level, never lower it.
export class ApprovalPolicy {
  constructor(
    private readonly rules: Record<
      string,
      ApprovalRule
    > = DEFAULT_APPROVAL_RULES
  ) {}

  evaluate(request: ApprovalRequest): ApprovalLevel {
    const rule =
      this.rules[`${request.server}/${request.tool}`] ??
      this.rules[request.tool];

    if (rule !== undefined)
      return typeof rule === 'function' ? rule(request.args) : rule;

    return request.annotations?.destructiveHint === true
      ? 'explicit'
      : 'confirm';
  }
}
