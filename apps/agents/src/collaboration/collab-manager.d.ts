import type { AgentCollaboration, CreateAgentCollaborationInput, UpdateAgentCollaborationInput, CollaborationRole, CollaborationScope, CollaborationSummary } from '@pravado/types';
export declare class CollabManager {
    joinGoal(input: CreateAgentCollaborationInput): Promise<AgentCollaboration>;
    leaveGoal(goalId: string, agentId: string, organizationId: string): Promise<void>;
    updateCollaboration(collaborationId: string, updates: UpdateAgentCollaborationInput, organizationId: string): Promise<AgentCollaboration>;
    getGoalCollaborators(goalId: string, organizationId: string): Promise<AgentCollaboration[]>;
    getActiveCollaborators(goalId: string, organizationId: string): Promise<AgentCollaboration[]>;
    checkTaskPermission(taskId: string, agentId: string, organizationId: string): Promise<boolean>;
    getCollaborationByAgent(goalId: string, agentId: string, organizationId: string): Promise<AgentCollaboration | null>;
    hasRole(goalId: string, agentId: string, role: CollaborationRole, organizationId: string): Promise<boolean>;
    hasScope(goalId: string, agentId: string, requiredScope: CollaborationScope, organizationId: string): Promise<boolean>;
    getCollaborationSummary(goalId: string, organizationId: string): Promise<CollaborationSummary>;
    private mapToCollaboration;
}
export declare const collabManager: CollabManager;
//# sourceMappingURL=collab-manager.d.ts.map