import type { AgentHandoff, CreateAgentHandoffInput, ResolveAgentHandoffInput } from '@pravado/types';
export declare class HandoffEngine {
    initiateHandoff(input: CreateAgentHandoffInput): Promise<AgentHandoff>;
    approveHandoff(handoffId: string, input: ResolveAgentHandoffInput, organizationId: string): Promise<AgentHandoff>;
    rejectHandoff(handoffId: string, input: ResolveAgentHandoffInput, organizationId: string): Promise<AgentHandoff>;
    cancelHandoff(handoffId: string, organizationId: string): Promise<AgentHandoff>;
    completeHandoff(handoffId: string, organizationId: string): Promise<AgentHandoff>;
    getHandoff(handoffId: string, organizationId: string): Promise<AgentHandoff>;
    getTaskHandoffs(taskId: string, organizationId: string): Promise<AgentHandoff[]>;
    getPendingHandoffs(agentId: string, organizationId: string): Promise<AgentHandoff[]>;
    private reassignTask;
    private mapToHandoff;
}
export declare const handoffEngine: HandoffEngine;
//# sourceMappingURL=handoff-engine.d.ts.map