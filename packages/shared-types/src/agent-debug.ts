// =====================================================
// AGENT DEBUG & TRACE LOGGING TYPES
// Sprint 59 Phase 5.6
// =====================================================

/**
 * Types of trace nodes in the execution tree
 */
export enum TraceNodeType {
  SYSTEM_PROMPT = 'system_prompt',
  USER_INPUT = 'user_input',
  TOOL_CALL = 'tool_call',
  FUNCTION_CALL = 'function_call',
  MEMORY_FETCH = 'memory_fetch',
  MEMORY_UPDATE = 'memory_update',
  CONTEXT_INJECTION = 'context_injection',
  PERSONALITY_APPLICATION = 'personality_application',
  RESPONSE_GENERATION = 'response_generation',
  RESPONSE_RENDER = 'response_render',
  ERROR_HANDLING = 'error_handling',
  VALIDATION = 'validation',
  API_CALL = 'api_call',
  DATABASE_QUERY = 'database_query',
  ESCALATION = 'escalation',
  PLAYBOOK_STEP = 'playbook_step',
  CUSTOM = 'custom',
}

/**
 * Severity levels for trace events
 */
export enum TraceSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Individual node in the trace tree
 */
export interface TraceNode {
  nodeId: string;
  parentNodeId: string | null;
  nodeType: TraceNodeType;
  severity: TraceSeverity;
  label: string;
  description?: string;
  startTime: Date;
  endTime: Date | null;
  duration?: number; // milliseconds
  metadata: Record<string, any>;
  inputData?: any;
  outputData?: any;
  errorMessage?: string;
  stackTrace?: string;
  children?: TraceNode[];
}

/**
 * A single execution step within a trace
 */
export interface AgentExecutionStep {
  stepId: string;
  stepIndex: number;
  stepType: TraceNodeType;
  label: string;
  duration: number;
  success: boolean;
  errorMessage?: string;
  metadata: Record<string, any>;
}

/**
 * Debug metadata for a trace
 */
export interface DebugMetadata {
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
  environmentInfo?: {
    nodeVersion?: string;
    platform?: string;
    timestamp?: Date;
  };
  customData?: Record<string, any>;
}

/**
 * Complete agent trace tree
 */
export interface AgentTraceTree {
  traceId: string;
  agentId: string;
  conversationId?: string;
  turnId?: string;
  rootNodes: TraceNode[];
  startTime: Date;
  endTime: Date | null;
  totalDuration?: number; // milliseconds
  debugMetadata: DebugMetadata;
  tags?: string[];
}

/**
 * High-level summary of a trace
 */
export interface AgentTraceSummary {
  traceId: string;
  agentId: string;
  agentName?: string;
  conversationId?: string;
  turnId?: string;
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  totalSteps: number;
  errorCount: number;
  warningCount: number;
  slowestNode?: {
    nodeId: string;
    label: string;
    duration: number;
  };
  mostCommonNodeType?: TraceNodeType;
  status: 'success' | 'partial_failure' | 'failure';
  tags?: string[];
}

/**
 * Trace log entry stored in database
 */
export interface TraceLogEntry {
  traceId: string;
  agentId: string;
  tenantId: string;
  conversationId?: string;
  turnId?: string;
  startTime: Date;
  endTime: Date | null;
  totalDuration?: number;
  rootNodeIds: string[];
  debugMetadata: DebugMetadata;
  tags?: string[];
  searchableText?: string; // For full-text search
  createdAt: Date;
}

/**
 * Trace node as stored in database
 */
export interface TraceNodeEntry {
  nodeId: string;
  traceId: string;
  parentNodeId: string | null;
  nodeType: TraceNodeType;
  severity: TraceSeverity;
  label: string;
  description?: string;
  startTime: Date;
  endTime: Date | null;
  duration?: number;
  metadata: Record<string, any>;
  inputData?: any;
  outputData?: any;
  errorMessage?: string;
  stackTrace?: string;
  createdAt: Date;
}

/**
 * Filters for searching traces
 */
export interface TraceSearchFilters {
  agentId?: string;
  conversationId?: string;
  turnId?: string;
  startDate?: Date;
  endDate?: Date;
  severity?: TraceSeverity;
  nodeType?: TraceNodeType;
  query?: string; // Full-text search
  tags?: string[];
  hasErrors?: boolean;
  minDuration?: number; // milliseconds
  maxDuration?: number; // milliseconds
  page?: number;
  pageSize?: number;
}

/**
 * Paginated trace search results
 */
export interface TraceSearchResults {
  traces: AgentTraceSummary[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Request to log a trace tree
 */
export interface LogTraceRequest {
  agentId: string;
  tenantId: string;
  conversationId?: string;
  turnId?: string;
  traceTree: AgentTraceTree;
  tags?: string[];
}

/**
 * Response after logging a trace
 */
export interface LogTraceResponse {
  traceId: string;
  nodesLogged: number;
  success: boolean;
}

/**
 * Trace node path (breadcrumb trail)
 */
export interface TraceNodePath {
  nodeId: string;
  label: string;
  nodeType: TraceNodeType;
  depth: number;
}

/**
 * Performance metrics for a trace
 */
export interface TracePerformanceMetrics {
  traceId: string;
  totalDuration: number;
  averageStepDuration: number;
  slowestSteps: Array<{
    nodeId: string;
    label: string;
    duration: number;
  }>;
  fastestSteps: Array<{
    nodeId: string;
    label: string;
    duration: number;
  }>;
  nodeTypeBreakdown: Record<TraceNodeType, number>; // count by type
  severityBreakdown: Record<TraceSeverity, number>; // count by severity
}
