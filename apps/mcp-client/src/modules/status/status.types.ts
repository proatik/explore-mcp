import type { ApprovalLevel } from '@/modules/approval/approval.types';

export interface ToolStatus {
  name: string;
  title: string;
  approval: ApprovalLevel;
}

export interface ServerStatus {
  name: string;
  state: string;
  protocolVersion?: string;
  tools: number;
  resources: number;
  prompts: number;
}

export interface ClientStatus {
  model: string | null;
  servers: ServerStatus[];
  tools: ToolStatus[];
}
