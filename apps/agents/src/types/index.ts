import type { AgentType, AgentContext } from '@pravado/types';

export interface AgentJobData {
  taskId: string;
  type: AgentType;
  context: AgentContext;
  userId: string;
  organizationId: string;
}
