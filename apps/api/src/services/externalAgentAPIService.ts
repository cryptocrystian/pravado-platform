// =====================================================
// EXTERNAL AGENT API SERVICE
// Sprint 54 Phase 5.1
// =====================================================

import { v4 as uuidv4 } from 'uuid';
import type {
  SubmitExternalTaskInput,
  SubmitTaskResponse,
  ExternalTaskResult,
  AgentStatusResponse,
  ConversationLogEntry,
  QueryAPILogsInput,
  APILogEvent,
  APIAnalytics,
  APIRequestStatus,
} from '@pravado/shared-types';
import { db } from '../database';
import { webhookDispatcherService } from './webhookDispatcherService';

/**
 * External Agent API Service
 *
 * Handles external agent requests from third-party applications,
 * including task submission, status checking, and conversation logs.
 */
class ExternalAgentAPIService {
  // =====================================================
  // TASK SUBMISSION
  // =====================================================

  /**
   * Submit external agent task
   */
  async submitExternalTask(
    clientId: string,
    organizationId: string,
    input: SubmitExternalTaskInput
  ): Promise<SubmitTaskResponse> {
    const {
      agentId,
      taskType,
      message,
      context = {},
      parameters = {},
      attachments = [],
      conversationId,
      webhookUrl,
    } = input;

    const requestId = uuidv4();
    const finalConversationId = conversationId || uuidv4();

    // Validate agent exists and belongs to organization
    const agentResult = await db.query(
      `SELECT * FROM agents WHERE agent_id = $1 AND organization_id = $2`,
      [agentId, organizationId]
    );

    if (agentResult.rows.length === 0) {
      throw new Error('Agent not found or does not belong to organization');
    }

    // Create external request record
    await db.query(
      `INSERT INTO external_agent_requests (
        request_id, client_id, organization_id, agent_id,
        task_type, input, status, conversation_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        requestId,
        clientId,
        organizationId,
        agentId,
        taskType,
        JSON.stringify({
          message,
          context,
          parameters,
          attachments,
        }),
        'pending',
        finalConversationId,
      ]
    );

    // Process the request (async)
    this.processAgentRequest(requestId, agentId, taskType, {
      message,
      context,
      parameters,
      attachments,
    }).catch((error) => {
      console.error('Error processing agent request:', error);
    });

    return {
      success: true,
      requestId,
      status: 'pending',
      conversationId: finalConversationId,
      estimatedCompletionTime: this.estimateCompletionTime(taskType),
      webhookRegistered: !!webhookUrl,
    };
  }

  /**
   * Process agent request
   * This is where we'd integrate with the actual agent system
   */
  private async processAgentRequest(
    requestId: string,
    agentId: string,
    taskType: string,
    input: any
  ): Promise<void> {
    try {
      // Update status to processing
      await this.updateRequestStatus(requestId, 'processing');

      const startTime = Date.now();

      // Simulate agent processing
      // In production, this would call the actual agent service
      const response = await this.simulateAgentProcessing(
        agentId,
        taskType,
        input
      );

      const processingTime = Date.now() - startTime;

      // Update request with response
      await db.query(
        `UPDATE external_agent_requests
         SET status = $1,
             response = $2,
             processing_time = $3,
             completed_at = NOW()
         WHERE request_id = $4`,
        [
          'completed',
          JSON.stringify(response),
          processingTime,
          requestId,
        ]
      );

      // Trigger webhook if configured
      await this.triggerResponseWebhook(requestId, response);
    } catch (error: any) {
      console.error('Error in agent processing:', error);

      // Update request with error
      await db.query(
        `UPDATE external_agent_requests
         SET status = $1,
             response = $2,
             completed_at = NOW()
         WHERE request_id = $3`,
        [
          'failed',
          JSON.stringify({
            errorMessage: error.message,
            error: error.toString(),
          }),
          requestId,
        ]
      );

      // Trigger error webhook
      await this.triggerErrorWebhook(requestId, error);
    }
  }

  /**
   * Simulate agent processing
   * In production, this would call the actual agent services
   */
  private async simulateAgentProcessing(
    agentId: string,
    taskType: string,
    input: any
  ): Promise<any> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      agentResponse: `Response to: ${input.message || 'No message provided'}`,
      confidence: 0.85,
      reasoning: 'Simulated agent reasoning',
      actions: ['simulated_action'],
      metadata: {
        taskType,
        processedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Get task result
   */
  async getTaskResult(
    requestId: string,
    clientId: string,
    organizationId: string
  ): Promise<ExternalTaskResult> {
    const result = await db.query(
      `SELECT * FROM external_agent_requests
       WHERE request_id = $1 AND client_id = $2 AND organization_id = $3`,
      [requestId, clientId, organizationId]
    );

    if (result.rows.length === 0) {
      throw new Error('Request not found');
    }

    const request = result.rows[0];
    const response = request.response || {};

    return {
      requestId: request.request_id,
      status: request.status,
      agentResponse: response.agentResponse,
      confidence: response.confidence,
      reasoning: response.reasoning,
      actions: response.actions,
      conversationId: request.conversation_id,
      processingTime: request.processing_time,
      errorMessage: response.errorMessage,
      metadata: response.metadata,
    };
  }

  // =====================================================
  // AGENT STATUS
  // =====================================================

  /**
   * Get agent status
   */
  async getAgentStatus(
    agentId: string,
    organizationId: string
  ): Promise<AgentStatusResponse> {
    const result = await db.query(
      `SELECT * FROM agents WHERE agent_id = $1 AND organization_id = $2`,
      [agentId, organizationId]
    );

    if (result.rows.length === 0) {
      throw new Error('Agent not found');
    }

    const agent = result.rows[0];

    // Get current agent load from active requests
    const loadResult = await db.query(
      `SELECT COUNT(*) as active_requests
       FROM external_agent_requests
       WHERE agent_id = $1 AND status IN ('pending', 'processing')`,
      [agentId]
    );

    const activeRequests = parseInt(loadResult.rows[0]?.active_requests || '0');

    return {
      agentId: agent.agent_id,
      name: agent.name,
      status: agent.status || 'online',
      availability: agent.is_active && activeRequests < 10,
      currentLoad: activeRequests,
      capabilities: agent.capabilities || [],
      lastActiveAt: agent.last_active_at,
      metadata: agent.metadata,
    };
  }

  // =====================================================
  // CONVERSATION LOGS
  // =====================================================

  /**
   * Get conversation history
   */
  async getConversationLog(
    conversationId: string,
    clientId: string,
    organizationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ConversationLogEntry[]> {
    // Get all requests for this conversation
    const result = await db.query(
      `SELECT * FROM external_agent_requests
       WHERE conversation_id = $1
         AND client_id = $2
         AND organization_id = $3
       ORDER BY created_at ASC
       LIMIT $4 OFFSET $5`,
      [conversationId, clientId, organizationId, limit, offset]
    );

    const logs: ConversationLogEntry[] = [];

    for (const request of result.rows) {
      const input = request.input || {};
      const response = request.response || {};

      // User message
      if (input.message) {
        logs.push({
          messageId: `${request.request_id}-user`,
          conversationId: request.conversation_id,
          role: 'user',
          content: input.message,
          timestamp: request.created_at,
          metadata: {
            requestId: request.request_id,
            taskType: request.task_type,
          },
        });
      }

      // Agent response
      if (response.agentResponse) {
        logs.push({
          messageId: `${request.request_id}-agent`,
          conversationId: request.conversation_id,
          role: 'agent',
          content: response.agentResponse,
          timestamp: request.completed_at || request.created_at,
          metadata: {
            requestId: request.request_id,
            confidence: response.confidence,
            reasoning: response.reasoning,
          },
        });
      }
    }

    return logs;
  }

  // =====================================================
  // API LOGGING
  // =====================================================

  /**
   * Log API request
   */
  async logAPIRequest(
    clientId: string,
    tokenId: string | null,
    organizationId: string,
    endpoint: string,
    method: string,
    status: APIRequestStatus,
    statusCode: number,
    requestBody: any,
    responseBody: any,
    errorMessage: string | null,
    ipAddress: string | null,
    userAgent: string | null,
    requestDuration: number
  ): Promise<void> {
    await db.query(
      `INSERT INTO api_access_logs (
        client_id, token_id, organization_id, endpoint, method,
        status, status_code, request_body, response_body, error_message,
        ip_address, user_agent, request_duration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        clientId,
        tokenId,
        organizationId,
        endpoint,
        method,
        status,
        statusCode,
        requestBody ? JSON.stringify(requestBody) : null,
        responseBody ? JSON.stringify(responseBody) : null,
        errorMessage,
        ipAddress,
        userAgent,
        requestDuration,
      ]
    );
  }

  /**
   * Query API logs
   */
  async queryAPILogs(input: QueryAPILogsInput): Promise<APILogEvent[]> {
    const {
      clientId,
      organizationId,
      startDate,
      endDate,
      status,
      endpoint,
      limit = 100,
      offset = 0,
    } = input;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (clientId) {
      conditions.push(`client_id = $${paramIndex++}`);
      values.push(clientId);
    }

    if (organizationId) {
      conditions.push(`organization_id = $${paramIndex++}`);
      values.push(organizationId);
    }

    if (startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(endDate);
    }

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (endpoint) {
      conditions.push(`endpoint = $${paramIndex++}`);
      values.push(endpoint);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    values.push(limit, offset);

    const result = await db.query(
      `SELECT * FROM api_access_logs
       ${whereClause}
       ORDER BY timestamp DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      values
    );

    return result.rows.map((row) => ({
      logId: row.log_id,
      clientId: row.client_id,
      tokenId: row.token_id,
      organizationId: row.organization_id,
      endpoint: row.endpoint,
      method: row.method,
      status: row.status,
      statusCode: row.status_code,
      requestBody: row.request_body,
      responseBody: row.response_body,
      errorMessage: row.error_message,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      requestDuration: row.request_duration,
      timestamp: row.timestamp,
      metadata: row.metadata,
    }));
  }

  /**
   * Get API analytics
   */
  async getAPIAnalytics(
    clientId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<APIAnalytics> {
    const result = await db.query(
      `SELECT * FROM get_api_analytics($1, $2, $3)`,
      [clientId, startDate, endDate]
    );

    const stats = result.rows[0];

    // Get requests by endpoint
    const endpointStatsResult = await db.query(
      `SELECT
         endpoint,
         COUNT(*) as count,
         AVG(request_duration) as avg_duration
       FROM api_access_logs
       WHERE client_id = $1
         AND timestamp BETWEEN $2 AND $3
       GROUP BY endpoint
       ORDER BY count DESC
       LIMIT 10`,
      [clientId, startDate, endDate]
    );

    // Get requests by status
    const statusStatsResult = await db.query(
      `SELECT
         status,
         COUNT(*) as count
       FROM api_access_logs
       WHERE client_id = $1
         AND timestamp BETWEEN $2 AND $3
       GROUP BY status`,
      [clientId, startDate, endDate]
    );

    // Get top errors
    const errorStatsResult = await db.query(
      `SELECT
         error_message,
         COUNT(*) as count
       FROM api_access_logs
       WHERE client_id = $1
         AND timestamp BETWEEN $2 AND $3
         AND error_message IS NOT NULL
       GROUP BY error_message
       ORDER BY count DESC
       LIMIT 5`,
      [clientId, startDate, endDate]
    );

    return {
      clientId,
      organizationId,
      period: {
        start: startDate,
        end: endDate,
      },
      totalRequests: parseInt(stats.total_requests || '0'),
      successfulRequests: parseInt(stats.successful_requests || '0'),
      failedRequests: parseInt(stats.failed_requests || '0'),
      rateLimitedRequests: parseInt(stats.rate_limited_requests || '0'),
      averageResponseTime: parseFloat(stats.average_response_time || '0'),
      p95ResponseTime: parseFloat(stats.p95_response_time || '0'),
      p99ResponseTime: parseFloat(stats.p99_response_time || '0'),
      requestsByEndpoint: endpointStatsResult.rows.map((row) => ({
        endpoint: row.endpoint,
        count: parseInt(row.count),
        averageResponseTime: parseFloat(row.avg_duration),
      })),
      requestsByStatus: statusStatsResult.rows.map((row) => ({
        status: row.status,
        count: parseInt(row.count),
      })),
      topErrors: errorStatsResult.rows.map((row) => ({
        error: row.error_message,
        count: parseInt(row.count),
      })),
    };
  }

  // =====================================================
  // WEBHOOK INTEGRATION
  // =====================================================

  /**
   * Trigger webhook for agent response
   */
  private async triggerResponseWebhook(
    requestId: string,
    response: any
  ): Promise<void> {
    // Get client's webhooks
    const requestResult = await db.query(
      `SELECT client_id FROM external_agent_requests WHERE request_id = $1`,
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      return;
    }

    const clientId = requestResult.rows[0].client_id;

    // Get active webhooks for agent_response event
    const webhooksResult = await db.query(
      `SELECT * FROM webhook_registrations
       WHERE client_id = $1
         AND is_active = true
         AND 'agent_response' = ANY(events)`,
      [clientId]
    );

    // Trigger each webhook
    for (const webhook of webhooksResult.rows) {
      await webhookDispatcherService.triggerWebhook({
        webhookId: webhook.webhook_id,
        eventType: 'agent_response',
        payload: {
          requestId,
          response,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Trigger webhook for error
   */
  private async triggerErrorWebhook(
    requestId: string,
    error: Error
  ): Promise<void> {
    // Similar to triggerResponseWebhook but for error_occurred event
    const requestResult = await db.query(
      `SELECT client_id FROM external_agent_requests WHERE request_id = $1`,
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      return;
    }

    const clientId = requestResult.rows[0].client_id;

    const webhooksResult = await db.query(
      `SELECT * FROM webhook_registrations
       WHERE client_id = $1
         AND is_active = true
         AND 'error_occurred' = ANY(events)`,
      [clientId]
    );

    for (const webhook of webhooksResult.rows) {
      await webhookDispatcherService.triggerWebhook({
        webhookId: webhook.webhook_id,
        eventType: 'error_occurred',
        payload: {
          requestId,
          error: {
            message: error.message,
            stack: error.stack,
          },
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Update request status
   */
  private async updateRequestStatus(
    requestId: string,
    status: APIRequestStatus
  ): Promise<void> {
    await db.query(
      `UPDATE external_agent_requests
       SET status = $1
       WHERE request_id = $2`,
      [status, requestId]
    );
  }

  /**
   * Estimate completion time based on task type
   */
  private estimateCompletionTime(taskType: string): number {
    switch (taskType) {
      case 'query':
        return 1000; // 1 second
      case 'conversation':
        return 2000; // 2 seconds
      case 'task':
        return 5000; // 5 seconds
      case 'command':
        return 500; // 0.5 seconds
      default:
        return 3000; // 3 seconds
    }
  }
}

// Export singleton instance
export const externalAgentAPIService = new ExternalAgentAPIService();
