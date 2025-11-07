// =====================================================
// WEBHOOK DISPATCHER SERVICE
// Sprint 54 Phase 5.1
// =====================================================

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosError } from 'axios';
import type {
  RegisterWebhookInput,
  TriggerWebhookInput,
  RegisterWebhookResponse,
  WebhookRegistration,
  WebhookDeliveryAttempt,
  WebhookEventType,
  WebhookDeliveryStatus,
  WebhookAnalytics,
} from '@pravado/types';
import { db } from '../database';

/**
 * Webhook Dispatcher Service
 *
 * Handles webhook registration, delivery, retry logic with exponential backoff,
 * and HMAC signature validation for secure webhook communication.
 */
class WebhookDispatcherService {
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_BACKOFF_MULTIPLIER = 2;
  private readonly DEFAULT_INITIAL_DELAY_MS = 1000;
  private readonly WEBHOOK_TIMEOUT_MS = 30000; // 30 seconds

  // =====================================================
  // WEBHOOK REGISTRATION
  // =====================================================

  /**
   * Register a new webhook
   */
  async registerWebhook(
    input: RegisterWebhookInput
  ): Promise<RegisterWebhookResponse> {
    const {
      clientId,
      organizationId,
      url,
      events,
      secret,
      maxRetries = this.DEFAULT_MAX_RETRIES,
      headers = {},
      metadata = {},
    } = input;

    // Generate webhook secret if not provided
    const webhookSecret = secret || this.generateSecret();
    const webhookId = uuidv4();

    const retryConfig = {
      maxRetries,
      backoffMultiplier: this.DEFAULT_BACKOFF_MULTIPLIER,
      initialDelayMs: this.DEFAULT_INITIAL_DELAY_MS,
    };

    await db.query(
      `INSERT INTO webhook_registrations (
        webhook_id, client_id, organization_id, url, events, secret,
        retry_config, headers, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        webhookId,
        clientId,
        organizationId,
        url,
        events,
        webhookSecret,
        JSON.stringify(retryConfig),
        JSON.stringify(headers),
        JSON.stringify(metadata),
      ]
    );

    return {
      success: true,
      webhookId,
      secret: webhookSecret,
      events,
      retryConfig,
    };
  }

  /**
   * Get webhook by ID
   */
  async getWebhook(
    webhookId: string,
    organizationId: string
  ): Promise<WebhookRegistration | null> {
    const result = await db.query(
      `SELECT * FROM webhook_registrations
       WHERE webhook_id = $1 AND organization_id = $2`,
      [webhookId, organizationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapWebhookRow(result.rows[0]);
  }

  /**
   * List webhooks for a client
   */
  async listClientWebhooks(
    clientId: string,
    organizationId: string
  ): Promise<WebhookRegistration[]> {
    const result = await db.query(
      `SELECT * FROM webhook_registrations
       WHERE client_id = $1 AND organization_id = $2
       ORDER BY created_at DESC`,
      [clientId, organizationId]
    );

    return result.rows.map((row) => this.mapWebhookRow(row));
  }

  /**
   * Update webhook
   */
  async updateWebhook(
    webhookId: string,
    organizationId: string,
    updates: Partial<{
      url: string;
      events: WebhookEventType[];
      isActive: boolean;
      headers: Record<string, string>;
    }>
  ): Promise<{ success: boolean }> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.url) {
      setClauses.push(`url = $${paramIndex++}`);
      values.push(updates.url);
    }

    if (updates.events) {
      setClauses.push(`events = $${paramIndex++}`);
      values.push(updates.events);
    }

    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    if (updates.headers) {
      setClauses.push(`headers = $${paramIndex++}`);
      values.push(JSON.stringify(updates.headers));
    }

    if (setClauses.length === 0) {
      return { success: false };
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(webhookId, organizationId);

    await db.query(
      `UPDATE webhook_registrations
       SET ${setClauses.join(', ')}
       WHERE webhook_id = $${paramIndex++} AND organization_id = $${paramIndex}`,
      values
    );

    return { success: true };
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(
    webhookId: string,
    organizationId: string
  ): Promise<{ success: boolean }> {
    await db.query(
      `DELETE FROM webhook_registrations
       WHERE webhook_id = $1 AND organization_id = $2`,
      [webhookId, organizationId]
    );

    return { success: true };
  }

  // =====================================================
  // WEBHOOK DELIVERY
  // =====================================================

  /**
   * Trigger webhook delivery
   */
  async triggerWebhook(input: TriggerWebhookInput): Promise<{ success: boolean }> {
    const { webhookId, eventType, payload } = input;

    // Get webhook configuration
    const webhookResult = await db.query(
      `SELECT * FROM webhook_registrations WHERE webhook_id = $1`,
      [webhookId]
    );

    if (webhookResult.rows.length === 0) {
      throw new Error('Webhook not found');
    }

    const webhook = this.mapWebhookRow(webhookResult.rows[0]);

    // Check if webhook is active
    if (!webhook.isActive) {
      throw new Error('Webhook is not active');
    }

    // Check if webhook is subscribed to this event
    if (!webhook.events.includes(eventType)) {
      // Silently skip - webhook not subscribed to this event
      return { success: true };
    }

    // Create delivery attempt
    const attemptId = await this.createDeliveryAttempt(
      webhookId,
      eventType,
      payload
    );

    // Attempt delivery (async - don't await)
    this.deliverWebhook(attemptId, webhook, eventType, payload, 1).catch((error) => {
      console.error('Error delivering webhook:', error);
    });

    return { success: true };
  }

  /**
   * Deliver webhook with retry logic
   */
  private async deliverWebhook(
    attemptId: string,
    webhook: WebhookRegistration,
    eventType: WebhookEventType,
    payload: Record<string, any>,
    attemptNumber: number
  ): Promise<void> {
    try {
      // Generate signature
      const timestamp = Date.now();
      const signature = this.generateSignature(webhook.secret, timestamp, payload);

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp.toString(),
        'X-Webhook-Event': eventType,
        'X-Webhook-ID': webhook.webhookId,
        'X-Webhook-Attempt': attemptNumber.toString(),
        ...webhook.headers,
      };

      // Send webhook
      const startTime = Date.now();
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: this.WEBHOOK_TIMEOUT_MS,
      });

      const duration = Date.now() - startTime;

      // Update attempt as delivered
      await this.updateDeliveryAttempt(attemptId, {
        status: 'delivered',
        statusCode: response.status,
        responseBody: JSON.stringify(response.data).substring(0, 1000),
        deliveredAt: new Date(),
      });

      console.log(
        `Webhook delivered successfully: ${webhook.webhookId} (${duration}ms)`
      );
    } catch (error: any) {
      console.error('Webhook delivery failed:', error.message);

      const isAxiosError = error.isAxiosError;
      const statusCode = isAxiosError ? error.response?.status : null;
      const errorMessage = isAxiosError
        ? error.message
        : 'Unknown error';

      // Determine if we should retry
      const shouldRetry =
        attemptNumber < webhook.retryConfig.maxRetries &&
        (!statusCode || statusCode >= 500 || statusCode === 429);

      if (shouldRetry) {
        // Calculate next retry delay with exponential backoff
        const delay =
          webhook.retryConfig.initialDelayMs *
          Math.pow(webhook.retryConfig.backoffMultiplier, attemptNumber - 1);
        const nextRetryAt = new Date(Date.now() + delay);

        // Update attempt as retrying
        await this.updateDeliveryAttempt(attemptId, {
          status: 'retrying',
          statusCode: statusCode || undefined,
          errorMessage,
          nextRetryAt,
        });

        // Schedule retry
        setTimeout(() => {
          this.deliverWebhook(
            attemptId,
            webhook,
            eventType,
            payload,
            attemptNumber + 1
          ).catch((retryError) => {
            console.error('Error in webhook retry:', retryError);
          });
        }, delay);
      } else {
        // Max retries exceeded or permanent failure
        await this.updateDeliveryAttempt(attemptId, {
          status: attemptNumber >= webhook.retryConfig.maxRetries ? 'abandoned' : 'failed',
          statusCode: statusCode || undefined,
          errorMessage,
        });
      }
    }
  }

  /**
   * Process webhook retry queue
   * This would be called periodically by a background job
   */
  async processRetryQueue(): Promise<void> {
    // Get all pending retries
    const result = await db.query(
      `SELECT a.*, w.*
       FROM webhook_delivery_attempts a
       INNER JOIN webhook_registrations w ON a.webhook_id = w.webhook_id
       WHERE a.status = 'retrying'
         AND a.next_retry_at <= NOW()
       ORDER BY a.next_retry_at ASC
       LIMIT 100`
    );

    for (const row of result.rows) {
      const webhook = this.mapWebhookRow(row);
      await this.deliverWebhook(
        row.attempt_id,
        webhook,
        row.event_type,
        row.payload,
        row.attempt_number + 1
      );
    }
  }

  // =====================================================
  // SIGNATURE VALIDATION
  // =====================================================

  /**
   * Generate HMAC signature for webhook
   */
  private generateSignature(
    secret: string,
    timestamp: number,
    payload: Record<string, any>
  ): string {
    const data = `${timestamp}.${JSON.stringify(payload)}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data);
    return hmac.digest('hex');
  }

  /**
   * Validate webhook signature
   * This would be used by webhook receivers to verify authenticity
   */
  validateSignature(
    secret: string,
    signature: string,
    timestamp: number,
    payload: Record<string, any>,
    toleranceMs: number = 300000 // 5 minutes
  ): boolean {
    // Check timestamp to prevent replay attacks
    const now = Date.now();
    if (Math.abs(now - timestamp) > toleranceMs) {
      return false;
    }

    // Verify signature
    const expectedSignature = this.generateSignature(secret, timestamp, payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // =====================================================
  // DELIVERY TRACKING
  // =====================================================

  /**
   * Create delivery attempt record
   */
  private async createDeliveryAttempt(
    webhookId: string,
    eventType: WebhookEventType,
    payload: Record<string, any>
  ): Promise<string> {
    const attemptId = uuidv4();

    await db.query(
      `INSERT INTO webhook_delivery_attempts (
        attempt_id, webhook_id, event_type, payload, status, attempt_number
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [attemptId, webhookId, eventType, JSON.stringify(payload), 'pending', 1]
    );

    return attemptId;
  }

  /**
   * Update delivery attempt
   */
  private async updateDeliveryAttempt(
    attemptId: string,
    updates: {
      status?: WebhookDeliveryStatus;
      statusCode?: number;
      responseBody?: string;
      errorMessage?: string;
      nextRetryAt?: Date;
      deliveredAt?: Date;
    }
  ): Promise<void> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (updates.statusCode !== undefined) {
      setClauses.push(`status_code = $${paramIndex++}`);
      values.push(updates.statusCode);
    }

    if (updates.responseBody) {
      setClauses.push(`response_body = $${paramIndex++}`);
      values.push(updates.responseBody);
    }

    if (updates.errorMessage) {
      setClauses.push(`error_message = $${paramIndex++}`);
      values.push(updates.errorMessage);
    }

    if (updates.nextRetryAt) {
      setClauses.push(`next_retry_at = $${paramIndex++}`);
      values.push(updates.nextRetryAt);
    }

    if (updates.deliveredAt) {
      setClauses.push(`delivered_at = $${paramIndex++}`);
      values.push(updates.deliveredAt);
    }

    if (setClauses.length === 0) {
      return;
    }

    values.push(attemptId);

    await db.query(
      `UPDATE webhook_delivery_attempts
       SET ${setClauses.join(', ')}
       WHERE attempt_id = $${paramIndex}`,
      values
    );
  }

  /**
   * Get webhook analytics
   */
  async getWebhookAnalytics(webhookId: string): Promise<WebhookAnalytics> {
    const result = await db.query(`SELECT * FROM get_webhook_stats($1)`, [
      webhookId,
    ]);

    const stats = result.rows[0];

    // Get deliveries by event type
    const eventStatsResult = await db.query(
      `SELECT
         event_type,
         COUNT(*) as count,
         COUNT(*) FILTER (WHERE status = 'delivered') as successful,
         (COUNT(*) FILTER (WHERE status = 'delivered')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100) as success_rate
       FROM webhook_delivery_attempts
       WHERE webhook_id = $1
       GROUP BY event_type`,
      [webhookId]
    );

    return {
      webhookId,
      totalAttempts: parseInt(stats.total_attempts || '0'),
      successfulDeliveries: parseInt(stats.successful_deliveries || '0'),
      failedDeliveries: parseInt(stats.failed_deliveries || '0'),
      averageDeliveryTime: parseFloat(stats.average_delivery_time || '0'),
      retryRate: parseFloat(stats.success_rate || '0'),
      lastDeliveryAt: stats.last_delivery_at,
      deliveriesByEvent: eventStatsResult.rows.map((row) => ({
        eventType: row.event_type,
        count: parseInt(row.count),
        successRate: parseFloat(row.success_rate || '0'),
      })),
    };
  }

  /**
   * Get delivery attempts for a webhook
   */
  async getDeliveryAttempts(
    webhookId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WebhookDeliveryAttempt[]> {
    const result = await db.query(
      `SELECT * FROM webhook_delivery_attempts
       WHERE webhook_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [webhookId, limit, offset]
    );

    return result.rows.map((row) => ({
      attemptId: row.attempt_id,
      webhookId: row.webhook_id,
      eventType: row.event_type,
      payload: row.payload,
      status: row.status,
      statusCode: row.status_code,
      responseBody: row.response_body,
      errorMessage: row.error_message,
      attemptNumber: row.attempt_number,
      nextRetryAt: row.next_retry_at,
      deliveredAt: row.delivered_at,
      createdAt: row.created_at,
    }));
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Generate webhook secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Map database row to WebhookRegistration
   */
  private mapWebhookRow(row: any): WebhookRegistration {
    return {
      webhookId: row.webhook_id,
      clientId: row.client_id,
      organizationId: row.organization_id,
      url: row.url,
      events: row.events,
      secret: row.secret,
      isActive: row.is_active,
      retryConfig: row.retry_config,
      headers: row.headers,
      createdAt: row.created_at,
      lastDeliveryAt: row.last_delivery_at,
      totalDeliveries: row.total_deliveries,
      failedDeliveries: row.failed_deliveries,
      metadata: row.metadata,
    };
  }
}

// Export singleton instance
export const webhookDispatcherService = new WebhookDispatcherService();
