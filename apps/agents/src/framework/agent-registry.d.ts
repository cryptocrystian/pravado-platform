import { AgentCategory, AgentRunnerConfig, AgentTool } from '@pravado/types';
export interface RegisteredAgent {
    id: string;
    name: string;
    description: string;
    category: AgentCategory;
    config: AgentRunnerConfig;
    tags: string[];
    version: string;
    isActive: boolean;
}
declare class AgentRegistryClass {
    private agents;
    private tools;
    registerAgent(agent: RegisteredAgent): void;
    unregisterAgent(agentId: string): void;
    registerTool(tool: AgentTool): void;
    unregisterTool(toolName: string): void;
    getAgent(agentId: string): RegisteredAgent | undefined;
    getAgentConfig(agentId: string): AgentRunnerConfig | undefined;
    getAllAgents(): RegisteredAgent[];
    getAgentsByCategory(category: AgentCategory): RegisteredAgent[];
    getActiveAgents(): RegisteredAgent[];
    getTool(toolName: string): AgentTool | undefined;
    getAllTools(): AgentTool[];
    getToolsForAgent(toolNames: string[]): AgentTool[];
    searchAgents(query: string): RegisteredAgent[];
    getAgentsByTags(tags: string[]): RegisteredAgent[];
    getRegistryStats(): {
        totalAgents: number;
        activeAgents: number;
        totalTools: number;
        agentsByCategory: Record<string, number>;
    };
    validateAgent(agentId: string): {
        valid: boolean;
        errors: string[];
    };
    clear(): void;
    initialize(agents: RegisteredAgent[], tools: AgentTool[]): void;
}
export declare const AgentRegistry: AgentRegistryClass;
export declare function getAgentConfig(agentId: string): AgentRunnerConfig | undefined;
export declare function listAllAgents(): RegisteredAgent[];
export declare function findAgents(query: string): RegisteredAgent[];
export {};
//# sourceMappingURL=agent-registry.d.ts.map