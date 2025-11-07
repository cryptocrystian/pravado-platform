// =====================================================
// AGENT DEBUG SERVICE
// Sprint 59 Phase 5.6
// =====================================================
// Provides comprehensive trace logging and debugging capabilities for agent executions

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase';
import {
  AgentTraceTree,
  TraceNode,
  TraceLogEntry,
  TraceNodeEntry,
  AgentTraceSummary,
  TraceSearchFilters,
  TraceSearchResults,
  LogTraceRequest,
  LogTraceResponse,
  TracePerformanceMetrics,
  TraceSeverity,
  TraceNodeType,
} from '@pravado/types';

export class AgentDebugService {
  /**
   * Logs a complete trace tree to the database
   */
  static async logTraceTree(request: LogTraceRequest): Promise<LogTraceResponse> {
    const { agentId, tenantId, conversationId, turnId, traceTree, tags } = request;

    try {
      const traceId = uuidv4();
      const rootNodeIds: string[] = [];
      let nodesLogged = 0;

      // Build searchable text from tags and metadata
      const searchableText = [
        ...(tags || []),
        agentId,
        conversationId,
        turnId,
        JSON.stringify(traceTree.debugMetadata),
      ]
        .filter(Boolean)
        .join(' ');

      // Insert trace log entry
      const { error: traceError } = await supabase
        .from('agent_trace_logs')
        .insert({
          trace_id: traceId,
          agent_id: agentId,
          tenant_id: tenantId,
          conversation_id: conversationId,
          turn_id: turnId,
          start_time: traceTree.startTime,
          end_time: traceTree.endTime,
          total_duration: traceTree.totalDuration,
          root_node_ids: [], // Will be updated after nodes are inserted
          debug_metadata: traceTree.debugMetadata,
          tags: tags || [],
          searchable_text: searchableText,
        });

      if (traceError) {
        console.error('Error inserting trace log:', traceError);
        throw new Error(`Failed to log trace: ${traceError.message}`);
      }

      // Recursively insert all nodes in the tree
      const insertNode = async (node: TraceNode, parentNodeId: string | null = null): Promise<void> => {
        const nodeId = node.nodeId || uuidv4();

        const { error: nodeError } = await supabase
          .from('agent_trace_nodes')
          .insert({
            node_id: nodeId,
            trace_id: traceId,
            parent_node_id: parentNodeId,
            node_type: node.nodeType,
            severity: node.severity,
            label: node.label,
            description: node.description,
            start_time: node.startTime,
            end_time: node.endTime,
            duration: node.duration,
            metadata: node.metadata || {},
            input_data: node.inputData,
            output_data: node.outputData,
            error_message: node.errorMessage,
            stack_trace: node.stackTrace,
          });

        if (nodeError) {
          console.error('Error inserting trace node:', nodeError);
          throw new Error(`Failed to log trace node: ${nodeError.message}`);
        }

        nodesLogged++;

        // Track root nodes
        if (parentNodeId === null) {
          rootNodeIds.push(nodeId);
        }

        // Recursively insert children
        if (node.children && node.children.length > 0) {
          for (const child of node.children) {
            await insertNode(child, nodeId);
          }
        }
      };

      // Insert all root nodes and their children
      for (const rootNode of traceTree.rootNodes) {
        await insertNode(rootNode);
      }

      // Update trace log with root node IDs
      await supabase
        .from('agent_trace_logs')
        .update({ root_node_ids: rootNodeIds })
        .eq('trace_id', traceId);

      return {
        traceId,
        nodesLogged,
        success: true,
      };
    } catch (error: any) {
      console.error('Error in logTraceTree:', error);
      throw error;
    }
  }

  /**
   * Retrieves trace by conversation turn ID
   */
  static async getTraceByTurn(turnId: string): Promise<AgentTraceTree | null> {
    try {
      const { data, error } = await supabase.rpc('get_trace_for_turn', {
        p_turn_id: turnId,
      });

      if (error) {
        console.error('Error fetching trace for turn:', error);
        throw new Error(`Failed to fetch trace: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return null;
      }

      const traceLog = data[0];

      // Fetch all nodes for this trace
      const nodes = await this.getTraceNodes(traceLog.trace_id);

      // Build tree structure
      const rootNodes = this.buildTraceTree(nodes, traceLog.root_node_ids);

      return {
        traceId: traceLog.trace_id,
        agentId: traceLog.agent_id,
        conversationId: traceLog.conversation_id,
        turnId,
        rootNodes,
        startTime: new Date(traceLog.start_time),
        endTime: traceLog.end_time ? new Date(traceLog.end_time) : null,
        totalDuration: traceLog.total_duration,
        debugMetadata: traceLog.debug_metadata,
        tags: traceLog.tags,
      };
    } catch (error: any) {
      console.error('Error in getTraceByTurn:', error);
      throw error;
    }
  }

  /**
   * Retrieves all traces for a specific agent
   */
  static async getTraceByAgent(
    agentId: string,
    page: number = 0,
    pageSize: number = 50
  ): Promise<TraceSearchResults> {
    try {
      const offset = page * pageSize;

      const { data, error } = await supabase.rpc('get_traces_for_agent', {
        p_agent_id: agentId,
        p_limit: pageSize,
        p_offset: offset,
      });

      if (error) {
        console.error('Error fetching traces for agent:', error);
        throw new Error(`Failed to fetch traces: ${error.message}`);
      }

      // Get total count
      const { count, error: countError } = await supabase
        .from('agent_trace_logs')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId);

      if (countError) {
        console.error('Error counting traces:', countError);
        throw new Error(`Failed to count traces: ${countError.message}`);
      }

      // Convert to summaries
      const summaries: AgentTraceSummary[] = await Promise.all(
        data.map(async (trace: any) => {
          const summary = await this.summarizeTrace(trace.trace_id);
          return summary!;
        })
      );

      return {
        traces: summaries.filter(Boolean),
        total: count || 0,
        page,
        pageSize,
      };
    } catch (error: any) {
      console.error('Error in getTraceByAgent:', error);
      throw error;
    }
  }

  /**
   * Searches traces based on filters
   */
  static async searchTraces(filters: TraceSearchFilters): Promise<TraceSearchResults> {
    try {
      const {
        agentId,
        conversationId,
        turnId,
        startDate,
        endDate,
        severity,
        nodeType,
        query,
        tags,
        hasErrors,
        minDuration,
        maxDuration,
        page = 0,
        pageSize = 50,
      } = filters;

      let queryBuilder = supabase.from('agent_trace_logs').select('*', { count: 'exact' });

      // Apply filters
      if (agentId) queryBuilder = queryBuilder.eq('agent_id', agentId);
      if (conversationId) queryBuilder = queryBuilder.eq('conversation_id', conversationId);
      if (turnId) queryBuilder = queryBuilder.eq('turn_id', turnId);
      if (startDate) queryBuilder = queryBuilder.gte('start_time', startDate.toISOString());
      if (endDate) queryBuilder = queryBuilder.lte('end_time', endDate.toISOString());
      if (minDuration) queryBuilder = queryBuilder.gte('total_duration', minDuration);
      if (maxDuration) queryBuilder = queryBuilder.lte('total_duration', maxDuration);
      if (tags && tags.length > 0) queryBuilder = queryBuilder.overlaps('tags', tags);

      // Full-text search
      if (query) {
        queryBuilder = queryBuilder.textSearch('searchable_text', query);
      }

      // If filtering by severity or node type, we need to join with nodes
      if (severity || nodeType || hasErrors !== undefined) {
        const { data: nodeTraceIds } = await supabase
          .from('agent_trace_nodes')
          .select('trace_id')
          .then((result) => {
            let nodeQuery = result;

            if (severity) {
              nodeQuery = supabase
                .from('agent_trace_nodes')
                .select('trace_id')
                .eq('severity', severity);
            }

            if (nodeType) {
              nodeQuery = supabase
                .from('agent_trace_nodes')
                .select('trace_id')
                .eq('node_type', nodeType);
            }

            if (hasErrors) {
              nodeQuery = supabase
                .from('agent_trace_nodes')
                .select('trace_id')
                .in('severity', ['error', 'critical']);
            }

            return nodeQuery;
          });

        if (nodeTraceIds) {
          const traceIds = [...new Set(nodeTraceIds.map((n: any) => n.trace_id))];
          queryBuilder = queryBuilder.in('trace_id', traceIds);
        }
      }

      // Pagination
      const offset = page * pageSize;
      queryBuilder = queryBuilder.range(offset, offset + pageSize - 1).order('created_at', { ascending: false });

      const { data, count, error } = await queryBuilder;

      if (error) {
        console.error('Error searching traces:', error);
        throw new Error(`Failed to search traces: ${error.message}`);
      }

      // Convert to summaries
      const summaries: AgentTraceSummary[] = await Promise.all(
        (data || []).map(async (trace: any) => {
          const summary = await this.summarizeTrace(trace.trace_id);
          return summary!;
        })
      );

      return {
        traces: summaries.filter(Boolean),
        total: count || 0,
        page,
        pageSize,
      };
    } catch (error: any) {
      console.error('Error in searchTraces:', error);
      throw error;
    }
  }

  /**
   * Generates a high-level summary of a trace
   */
  static async summarizeTrace(traceId: string): Promise<AgentTraceSummary | null> {
    try {
      // Get trace log
      const { data: traceData, error: traceError } = await supabase
        .from('agent_trace_logs')
        .select('*')
        .eq('trace_id', traceId)
        .single();

      if (traceError) {
        console.error('Error fetching trace log:', traceError);
        return null;
      }

      // Get summary statistics
      const { data: summaryData, error: summaryError } = await supabase.rpc('get_trace_summary', {
        p_trace_id: traceId,
      });

      if (summaryError) {
        console.error('Error fetching trace summary:', summaryError);
        return null;
      }

      const summary = summaryData[0];

      // Determine status
      let status: 'success' | 'partial_failure' | 'failure' = 'success';
      if (summary.error_count > 0) {
        status = summary.error_count >= summary.total_steps / 2 ? 'failure' : 'partial_failure';
      }

      // Get most common node type
      const { data: nodeTypes } = await supabase
        .from('agent_trace_nodes')
        .select('node_type')
        .eq('trace_id', traceId);

      const nodeTypeCounts: Record<string, number> = {};
      (nodeTypes || []).forEach((nt: any) => {
        nodeTypeCounts[nt.node_type] = (nodeTypeCounts[nt.node_type] || 0) + 1;
      });

      const mostCommonNodeType = Object.keys(nodeTypeCounts).reduce(
        (a, b) => (nodeTypeCounts[a] > nodeTypeCounts[b] ? a : b),
        Object.keys(nodeTypeCounts)[0]
      ) as TraceNodeType;

      return {
        traceId: traceData.trace_id,
        agentId: traceData.agent_id,
        conversationId: traceData.conversation_id,
        turnId: traceData.turn_id,
        startTime: new Date(traceData.start_time),
        endTime: new Date(traceData.end_time || traceData.start_time),
        totalDuration: traceData.total_duration || 0,
        totalSteps: summary.total_steps || 0,
        errorCount: summary.error_count || 0,
        warningCount: summary.warning_count || 0,
        slowestNode: summary.slowest_node_id
          ? {
              nodeId: summary.slowest_node_id,
              label: summary.slowest_node_label || 'Unknown',
              duration: summary.max_step_duration || 0,
            }
          : undefined,
        mostCommonNodeType,
        status,
        tags: traceData.tags,
      };
    } catch (error: any) {
      console.error('Error in summarizeTrace:', error);
      return null;
    }
  }

  /**
   * Helper: Get all nodes for a trace
   */
  private static async getTraceNodes(traceId: string): Promise<TraceNodeEntry[]> {
    const { data, error } = await supabase
      .from('agent_trace_nodes')
      .select('*')
      .eq('trace_id', traceId)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching trace nodes:', error);
      throw new Error(`Failed to fetch trace nodes: ${error.message}`);
    }

    return (data || []).map((node: any) => ({
      nodeId: node.node_id,
      traceId: node.trace_id,
      parentNodeId: node.parent_node_id,
      nodeType: node.node_type as TraceNodeType,
      severity: node.severity as TraceSeverity,
      label: node.label,
      description: node.description,
      startTime: new Date(node.start_time),
      endTime: node.end_time ? new Date(node.end_time) : null,
      duration: node.duration,
      metadata: node.metadata,
      inputData: node.input_data,
      outputData: node.output_data,
      errorMessage: node.error_message,
      stackTrace: node.stack_trace,
      createdAt: new Date(node.created_at),
    }));
  }

  /**
   * Helper: Build tree structure from flat list of nodes
   */
  private static buildTraceTree(nodes: TraceNodeEntry[], rootNodeIds: string[]): TraceNode[] {
    const nodeMap = new Map<string, TraceNode>();

    // Create all nodes
    nodes.forEach((node) => {
      nodeMap.set(node.nodeId, {
        nodeId: node.nodeId,
        parentNodeId: node.parentNodeId,
        nodeType: node.nodeType,
        severity: node.severity,
        label: node.label,
        description: node.description,
        startTime: node.startTime,
        endTime: node.endTime,
        duration: node.duration,
        metadata: node.metadata,
        inputData: node.inputData,
        outputData: node.outputData,
        errorMessage: node.errorMessage,
        stackTrace: node.stackTrace,
        children: [],
      });
    });

    // Build parent-child relationships
    nodes.forEach((node) => {
      if (node.parentNodeId) {
        const parent = nodeMap.get(node.parentNodeId);
        const child = nodeMap.get(node.nodeId);
        if (parent && child) {
          parent.children!.push(child);
        }
      }
    });

    // Return root nodes
    return rootNodeIds.map((id) => nodeMap.get(id)!).filter(Boolean);
  }

  /**
   * Get performance metrics for a trace
   */
  static async getPerformanceMetrics(traceId: string): Promise<TracePerformanceMetrics | null> {
    try {
      const { data: nodes, error } = await supabase
        .from('agent_trace_nodes')
        .select('*')
        .eq('trace_id', traceId)
        .not('duration', 'is', null)
        .order('duration', { ascending: false });

      if (error) {
        console.error('Error fetching nodes for metrics:', error);
        return null;
      }

      if (!nodes || nodes.length === 0) {
        return null;
      }

      const durations = nodes.map((n: any) => n.duration).filter(Boolean);
      const totalDuration = durations.reduce((sum, d) => sum + d, 0);
      const averageStepDuration = totalDuration / durations.length;

      const slowestSteps = nodes.slice(0, 5).map((n: any) => ({
        nodeId: n.node_id,
        label: n.label,
        duration: n.duration,
      }));

      const fastestSteps = nodes
        .slice(-5)
        .reverse()
        .map((n: any) => ({
          nodeId: n.node_id,
          label: n.label,
          duration: n.duration,
        }));

      // Node type breakdown
      const nodeTypeBreakdown: Record<TraceNodeType, number> = {} as any;
      nodes.forEach((n: any) => {
        nodeTypeBreakdown[n.node_type as TraceNodeType] =
          (nodeTypeBreakdown[n.node_type as TraceNodeType] || 0) + 1;
      });

      // Severity breakdown
      const severityBreakdown: Record<TraceSeverity, number> = {} as any;
      nodes.forEach((n: any) => {
        severityBreakdown[n.severity as TraceSeverity] = (severityBreakdown[n.severity as TraceSeverity] || 0) + 1;
      });

      return {
        traceId,
        totalDuration,
        averageStepDuration,
        slowestSteps,
        fastestSteps,
        nodeTypeBreakdown,
        severityBreakdown,
      };
    } catch (error: any) {
      console.error('Error in getPerformanceMetrics:', error);
      return null;
    }
  }
}
