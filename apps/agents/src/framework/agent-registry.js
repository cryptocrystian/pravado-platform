"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRegistry = void 0;
exports.getAgentConfig = getAgentConfig;
exports.listAllAgents = listAllAgents;
exports.findAgents = findAgents;
const logger_1 = require("../lib/logger");
class AgentRegistryClass {
    agents = new Map();
    tools = new Map();
    registerAgent(agent) {
        if (this.agents.has(agent.id)) {
            logger_1.logger.warn(`[AgentRegistry] Agent already registered: ${agent.id}, overwriting`);
        }
        this.agents.set(agent.id, agent);
        logger_1.logger.info(`[AgentRegistry] Registered agent: ${agent.id} (${agent.name})`);
    }
    unregisterAgent(agentId) {
        if (!this.agents.has(agentId)) {
            logger_1.logger.warn(`[AgentRegistry] Agent not found: ${agentId}`);
            return;
        }
        this.agents.delete(agentId);
        logger_1.logger.info(`[AgentRegistry] Unregistered agent: ${agentId}`);
    }
    registerTool(tool) {
        if (this.tools.has(tool.name)) {
            logger_1.logger.warn(`[AgentRegistry] Tool already registered: ${tool.name}, overwriting`);
        }
        this.tools.set(tool.name, tool);
        logger_1.logger.info(`[AgentRegistry] Registered tool: ${tool.name}`);
    }
    unregisterTool(toolName) {
        if (!this.tools.has(toolName)) {
            logger_1.logger.warn(`[AgentRegistry] Tool not found: ${toolName}`);
            return;
        }
        this.tools.delete(toolName);
        logger_1.logger.info(`[AgentRegistry] Unregistered tool: ${toolName}`);
    }
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    getAgentConfig(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            logger_1.logger.warn(`[AgentRegistry] Agent not found: ${agentId}`);
            return undefined;
        }
        const tools = this.getToolsForAgent(agent.config.requiredTools || []);
        return {
            ...agent.config,
            tools,
        };
    }
    getAllAgents() {
        return Array.from(this.agents.values());
    }
    getAgentsByCategory(category) {
        return Array.from(this.agents.values()).filter((agent) => agent.category === category);
    }
    getActiveAgents() {
        return Array.from(this.agents.values()).filter((agent) => agent.isActive);
    }
    getTool(toolName) {
        return this.tools.get(toolName);
    }
    getAllTools() {
        return Array.from(this.tools.values());
    }
    getToolsForAgent(toolNames) {
        return toolNames
            .map((name) => this.tools.get(name))
            .filter((tool) => tool !== undefined);
    }
    searchAgents(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.agents.values()).filter((agent) => {
            return (agent.name.toLowerCase().includes(lowerQuery) ||
                agent.description.toLowerCase().includes(lowerQuery) ||
                agent.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)));
        });
    }
    getAgentsByTags(tags) {
        const lowerTags = tags.map((t) => t.toLowerCase());
        return Array.from(this.agents.values()).filter((agent) => {
            return agent.tags.some((tag) => lowerTags.includes(tag.toLowerCase()));
        });
    }
    getRegistryStats() {
        const agents = Array.from(this.agents.values());
        const agentsByCategory = agents.reduce((acc, agent) => {
            acc[agent.category] = (acc[agent.category] || 0) + 1;
            return acc;
        }, {});
        return {
            totalAgents: agents.length,
            activeAgents: agents.filter((a) => a.isActive).length,
            totalTools: this.tools.size,
            agentsByCategory,
        };
    }
    validateAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return { valid: false, errors: [`Agent not found: ${agentId}`] };
        }
        const errors = [];
        const requiredTools = agent.config.requiredTools || [];
        const missingTools = requiredTools.filter((toolName) => !this.tools.has(toolName));
        if (missingTools.length > 0) {
            errors.push(`Missing required tools: ${missingTools.join(', ')}`);
        }
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
    clear() {
        this.agents.clear();
        this.tools.clear();
        logger_1.logger.info('[AgentRegistry] Registry cleared');
    }
    initialize(agents, tools) {
        this.clear();
        agents.forEach((agent) => this.registerAgent(agent));
        tools.forEach((tool) => this.registerTool(tool));
        logger_1.logger.info(`[AgentRegistry] Initialized with ${agents.length} agents and ${tools.length} tools`);
    }
}
exports.AgentRegistry = new AgentRegistryClass();
function getAgentConfig(agentId) {
    return exports.AgentRegistry.getAgentConfig(agentId);
}
function listAllAgents() {
    return exports.AgentRegistry.getAllAgents();
}
function findAgents(query) {
    return exports.AgentRegistry.searchAgents(query);
}
//# sourceMappingURL=agent-registry.js.map