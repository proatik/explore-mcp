import type { AgentEvent } from '@/modules/agent/agent.types';
import type { PendingApproval } from '@/modules/approval/web-approver';

export type ChatEvent =
  | AgentEvent
  | { type: 'run_started' }
  | { type: 'run_finished' }
  | { type: 'error'; message: string }
  | ({ type: 'approval_required' } & PendingApproval);
