// =====================================================
// AGENT REGISTRY - Centralized Agent Management
// =====================================================

import { AgentCategory, AgentRunnerConfig, AgentTool } from '@pravado/shared-types';
import { logger } from '../lib/logger';

// =====================================================
// REGISTRY TYPES
// =====================================================

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

// =====================================================
// AGENT REGISTRY CLASS
// =====================================================

class AgentRegistryClass {
  private agents: Map<string, RegisteredAgent> = new Map();
  private tools: Map<string, AgentTool> = new Map();

  // =====================================================
  // AGENT REGISTRATION
  // =====================================================

  registerAgent(agent: RegisteredAgent): void {
    if (this.agents.has(agent.id)) {
      logger.warn(`[AgentRegistry] Agent already registered: ${agent.id}, overwriting`);
    }

    this.agents.set(agent.id, agent);
    logger.info(`[AgentRegistry] Registered agent: ${agent.id} (${agent.name})`);
  }

  unregisterAgent(agentId: string): void {
    if (!this.agents.has(agentId)) {
      logger.warn(`[AgentRegistry] Agent not found: ${agentId}`);
      return;
    }

    this.agents.delete(agentId);
    logger.info(`[AgentRegistry] Unregistered agent: ${agentId}`);
  }

  // =====================================================
  // TOOL REGISTRATION
  // =====================================================

  registerTool(tool: AgentTool): void {
    if (this.tools.has(tool.name)) {
      logger.warn(`[AgentRegistry] Tool already registered: ${tool.name}, overwriting`);
    }

    this.tools.set(tool.name, tool);
    logger.info(`[AgentRegistry] Registered tool: ${tool.name}`);
  }

  unregisterTool(toolName: string): void {
    if (!this.tools.has(toolName)) {
      logger.warn(`[AgentRegistry] Tool not found: ${toolName}`);
      return;
    }

    this.tools.delete(toolName);
    logger.info(`[AgentRegistry] Unregistered tool: ${toolName}`);
  }

  // =====================================================
  // AGENT LOOKUP
  // =====================================================

  getAgent(agentId: string): RegisteredAgent | undefined {
    return this.agents.get(agentId);
  }

  getAgentConfig(agentId: string): AgentRunnerConfig | undefined {
    const agent = this.agents.get(agentId);
    if (!agent) {
      logger.warn(`[AgentRegistry] Agent not found: ${agentId}`);
      return undefined;
    }

    // Attach registered tools
    const tools = this.getToolsForAgent(agent.config.requiredTools || []);
    return {
      ...agent.config,
      tools,
    };
  }

  getAllAgents(): RegisteredAgent[] {
    return Array.from(this.agents.values());
  }

  getAgentsByCategory(category: AgentCategory): RegisteredAgent[] {
    return Array.from(this.agents.values()).filter((agent) => agent.category === category);
  }

  getActiveAgents(): RegisteredAgent[] {
    return Array.from(this.agents.values()).filter((agent) => agent.isActive);
  }

  // =====================================================
  // TOOL LOOKUP
  // =====================================================

  getTool(toolName: string): AgentTool | undefined {
    return this.tools.get(toolName);
  }

  getAllTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  getToolsForAgent(toolNames: string[]): AgentTool[] {
    return toolNames
      .map((name) => this.tools.get(name))
      .filter((tool): tool is AgentTool => tool !== undefined);
  }

  // =====================================================
  // SEARCH & DISCOVERY
  // =====================================================

  searchAgents(query: string): RegisteredAgent[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.agents.values()).filter((agent) => {
      return (
        agent.name.toLowerCase().includes(lowerQuery) ||
        agent.description.toLowerCase().includes(lowerQuery) ||
        agent.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    });
  }

  getAgentsByTags(tags: string[]): RegisteredAgent[] {
    const lowerTags = tags.map((t) => t.toLowerCase());
    return Array.from(this.agents.values()).filter((agent) => {
      return agent.tags.some((tag) => lowerTags.includes(tag.toLowerCase()));
    });
  }

  // =====================================================
  // STATISTICS
  // =====================================================

  getRegistryStats(): {
    totalAgents: number;
    activeAgents: number;
    totalTools: number;
    agentsByCategory: Record<string, number>;
  } {
    const agents = Array.from(this.agents.values());

    const agentsByCategory = agents.reduce((acc, agent) => {
      acc[agent.category] = (acc[agent.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter((a) => a.isActive).length,
      totalTools: this.tools.size,
      agentsByCategory,
    };
  }

  // =====================================================
  // VALIDATION
  // =====================================================

  validateAgent(agentId: string): { valid: boolean; errors: string[] } {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { valid: false, errors: [`Agent not found: ${agentId}`] };
    }

    const errors: string[] = [];

    // Check required tools are registered
    const requiredTools = agent.config.requiredTools || [];
    const missingTools = requiredTools.filter((toolName) => !this.tools.has(toolName));
    if (missingTools.length > 0) {
      errors.push(`Missing required tools: ${missingTools.join(', ')}`);
    }

    // Check config has required fields
    if (!agent.config.systemPrompt) {
      errors.push('Missing system prompt');
    }
    if (!agent.config.inputSchema) {
      errors.push('Missing input schema');
    }
    if (!agent.config.outputSchema) {
      errors.push('Missing output schema');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // =====================================================
  // INITIALIZATION
  // =====================================================

  clear(): void {
    this.agents.clear();
    this.tools.clear();
    logger.info('[AgentRegistry] Registry cleared');
  }

  initialize(agents: RegisteredAgent[], tools: AgentTool[]): void {
    this.clear();

    agents.forEach((agent) => this.registerAgent(agent));
    tools.forEach((tool) => this.registerTool(tool));

    logger.info(`[AgentRegistry] Initialized with ${agents.length} agents and ${tools.length} tools`);
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const AgentRegistry = new AgentRegistryClass();

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function getAgentConfig(agentId: string): AgentRunnerConfig | undefined {
  return AgentRegistry.getAgentConfig(agentId);
}

export function listAllAgents(): RegisteredAgent[] {
  return AgentRegistry.getAllAgents();
}

export function findAgents(query: string): RegisteredAgent[] {
  return AgentRegistry.searchAgents(query);
}
