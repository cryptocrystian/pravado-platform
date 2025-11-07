// =====================================================
// EXTERNAL AGENT API ROUTES
// Sprint 54 Phase 5.1
// =====================================================

import express, { Request, Response, NextFunction } from 'express';
import { externalAPIAuthService } from '../services/externalAPIAuthService';
import { externalAgentAPIService } from '../services/externalAgentAPIService';
import { webhookDispatcherService } from '../services/webhookDispatcherService';
import type {
  SubmitExternalTaskInput,
  RegisterWebhookInput,
  RotateAPITokenInput,
} from '@pravado/types';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

/**
 * Middleware to authenticate API token and check rate limits
 */
async function authenticateExternalAPI(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const startTime = Date.now();

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Validate token
    const validation = await externalAPIAuthService.validateAPIToken({
      token,
      endpoint: req.path,
      method: req.method,
    });

    if (!validation.valid) {
      // Log failed auth attempt
      await logAPIRequest(
        req,
        null,
        null,
        null,
        'unauthorized',
        401,
        null,
        { error: validation.errorMessage },
        validation.errorMessage || 'Token validation failed',
        Date.now() - startTime
      );

      return res.status(401).json({
        error: 'Unauthorized',
        message: validation.errorMessage,
      });
    }

    // Check if rate limited
    if (validation.rateLimitStatus?.isLimited) {
      // Log rate limited request
      await logAPIRequest(
        req,
        validation.clientId || null,
        validation.organizationId || null,
        null,
        'rate_limited',
        429,
        req.body,
        { error: 'Rate limit exceeded' },
        'Rate limit exceeded',
        Date.now() - startTime
      );

      return res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: 'You have exceeded your rate limit',
        rateLimitStatus: validation.rateLimitStatus,
      });
    }

    // Attach auth info to request
    (req as any).auth = {
      clientId: validation.clientId,
      organizationId: validation.organizationId,
      accessLevel: validation.accessLevel,
      scopes: validation.scopes,
    };

    // Add rate limit headers
    if (validation.rateLimitStatus) {
      res.setHeader(
        'X-RateLimit-Limit-Minute',
        validation.rateLimitStatus.limits.requestsPerMinute
      );
      res.setHeader(
        'X-RateLimit-Remaining-Minute',
        validation.rateLimitStatus.remaining.requestsThisMinute
      );
      res.setHeader(
        'X-RateLimit-Reset-Minute',
        validation.rateLimitStatus.resetAt.minute.toISOString()
      );
    }

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Log API request
 */
async function logAPIRequest(
  req: Request,
  clientId: string | null,
  organizationId: string | null,
  tokenId: string | null,
  status: any,
  statusCode: number,
  requestBody: any,
  responseBody: any,
  errorMessage: string | null,
  duration: number
) {
  if (!clientId || !organizationId) {
    return;
  }

  await externalAgentAPIService.logAPIRequest(
    clientId,
    tokenId,
    organizationId,
    req.path,
    req.method,
    status,
    statusCode,
    requestBody,
    responseBody,
    errorMessage,
    req.ip || null,
    req.headers['user-agent'] || null,
    duration
  );
}

// =====================================================
// API ROUTES
// =====================================================

/**
 * POST /api/external-agent/submit-task
 * Submit a task to an agent
 */
router.post(
  '/submit-task',
  authenticateExternalAPI,
  async (req: Request, res: Response) => {
    const startTime = Date.now();
    const auth = (req as any).auth;

    try {
      const input: SubmitExternalTaskInput = req.body;

      if (!input.agentId || !input.taskType) {
        await logAPIRequest(
          req,
          auth.clientId,
          auth.organizationId,
          null,
          'failed',
          400,
          req.body,
          { error: 'Invalid input' },
          'agentId and taskType are required',
          Date.now() - startTime
        );

        return res.status(400).json({
          error: 'Invalid input',
          message: 'agentId and taskType are required',
        });
      }

      const result = await externalAgentAPIService.submitExternalTask(
        auth.clientId,
        auth.organizationId,
        input
      );

      await logAPIRequest(
        req,
        auth.clientId,
        auth.organizationId,
        null,
        'completed',
        200,
        req.body,
        result,
        null,
        Date.now() - startTime
      );

      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      console.error('Error submitting task:', error);

      await logAPIRequest(
        req,
        auth.clientId,
        auth.organizationId,
        null,
        'failed',
        500,
        req.body,
        { error: error.message },
        error.message,
        Date.now() - startTime
      );

      res.status(500).json({
        error: 'Failed to submit task',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/external-agent/result/:requestId
 * Get task result
 */
router.get(
  '/result/:requestId',
  authenticateExternalAPI,
  async (req: Request, res: Response) => {
    const startTime = Date.now();
    const auth = (req as any).auth;

    try {
      const { requestId } = req.params;

      const result = await externalAgentAPIService.getTaskResult(
        requestId,
        auth.clientId,
        auth.organizationId
      );

      await logAPIRequest(
        req,
        auth.clientId,
        auth.organizationId,
        null,
        'completed',
        200,
        null,
        result,
        null,
        Date.now() - startTime
      );

      res.status(200).json({ success: true, result });
    } catch (error: any) {
      console.error('Error getting result:', error);

      await logAPIRequest(
        req,
        auth.clientId,
        auth.organizationId,
        null,
        'failed',
        error.message === 'Request not found' ? 404 : 500,
        null,
        { error: error.message },
        error.message,
        Date.now() - startTime
      );

      res.status(error.message === 'Request not found' ? 404 : 500).json({
        error: 'Failed to get result',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/external-agent/status/:agentId
 * Get agent status
 */
router.get(
  '/status/:agentId',
  authenticateExternalAPI,
  async (req: Request, res: Response) => {
    const startTime = Date.now();
    const auth = (req as any).auth;

    try {
      const { agentId } = req.params;

      const status = await externalAgentAPIService.getAgentStatus(
        agentId,
        auth.organizationId
      );

      await logAPIRequest(
        req,
        auth.clientId,
        auth.organizationId,
        null,
        'completed',
        200,
        null,
        status,
        null,
        Date.now() - startTime
      );

      res.status(200).json({ success: true, status });
    } catch (error: any) {
      console.error('Error getting agent status:', error);

      await logAPIRequest(
        req,
        auth.clientId,
        auth.organizationId,
        null,
        'failed',
        error.message === 'Agent not found' ? 404 : 500,
        null,
        { error: error.message },
        error.message,
        Date.now() - startTime
      );

      res.status(error.message === 'Agent not found' ? 404 : 500).json({
        error: 'Failed to get agent status',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/external-agent/history/:conversationId
 * Get conversation history
 */
router.get(
  '/history/:conversationId',
  authenticateExternalAPI,
  async (req: Request, res: Response) => {
    const startTime = Date.now();
    const auth = (req as any).auth;

    try {
      const { conversationId } = req.params;
      const { limit, offset } = req.query;

      const history = await externalAgentAPIService.getConversationLog(
        conversationId,
        auth.clientId,
        auth.organizationId,
        limit ? parseInt(limit as string) : 50,
        offset ? parseInt(offset as string) : 0
      );

      await logAPIRequest(
        req,
        auth.clientId,
        auth.organizationId,
        null,
        'completed',
        200,
        null,
        { count: history.length },
        null,
        Date.now() - startTime
      );

      res.status(200).json({ success: true, history });
    } catch (error: any) {
      console.error('Error getting conversation history:', error);

      await logAPIRequest(
        req,
        auth.clientId,
        auth.organizationId,
        null,
        'failed',
        500,
        null,
        { error: error.message },
        error.message,
        Date.now() - startTime
      );

      res.status(500).json({
        error: 'Failed to get conversation history',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/external-agent/register-webhook
 * Register a webhook
 */
router.post(
  '/register-webhook',
  authenticateExternalAPI,
  async (req: Request, res: Response) => {
    const startTime = Date.now();
    const auth = (req as any).auth;

    try {
      const input: RegisterWebhookInput = {
        ...req.body,
        clientId: auth.clientId,
        organizationId: auth.organizationId,
      };

      if (!input.url || !input.events || input.events.length === 0) {
        await logAPIRequest(
          req,
          auth.clientId,
          auth.organizationId,
          null,
          'failed',
          400,
          req.body,
          { error: 'Invalid input' },
          'url and events are required',
          Date.now() - startTime
        );

        return res.status(400).json({
          error: 'Invalid input',
          message: 'url and events are required',
        });
      }

      const result = await webhookDispatcherService.registerWebhook(input);

      await logAPIRequest(
        req,
        auth.clientId,
        auth.organizationId,
        null,
        'completed',
        201,
        req.body,
        result,
        null,
        Date.now() - startTime
      );

      res.status(201).json({ success: true, ...result });
    } catch (error: any) {
      console.error('Error registering webhook:', error);

      await logAPIRequest(
        req,
        auth.clientId,
        auth.organizationId,
        null,
        'failed',
        500,
        req.body,
        { error: error.message },
        error.message,
        Date.now() - startTime
      );

      res.status(500).json({
        error: 'Failed to register webhook',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/external-agent/rotate-token
 * Rotate API token
 */
router.post(
  '/rotate-token',
  authenticateExternalAPI,
  async (req: Request, res: Response) => {
    const startTime = Date.now();
    const auth = (req as any).auth;

    try {
      const input: RotateAPITokenInput = req.body;

      if (!input.tokenId) {
        await logAPIRequest(
          req,
          auth.clientId,
          auth.organizationId,
          null,
          'failed',
          400,
          req.body,
          { error: 'Invalid input' },
          'tokenId is required',
          Date.now() - startTime
        );

        return res.status(400).json({
          error: 'Invalid input',
          message: 'tokenId is required',
        });
      }

      const result = await externalAPIAuthService.rotateAPIToken(input);

      await logAPIRequest(
        req,
        auth.clientId,
        auth.organizationId,
        null,
        'completed',
        200,
        req.body,
        { success: result.success },
        null,
        Date.now() - startTime
      );

      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      console.error('Error rotating token:', error);

      await logAPIRequest(
        req,
        auth.clientId,
        auth.organizationId,
        null,
        'failed',
        500,
        req.body,
        { error: error.message },
        error.message,
        Date.now() - startTime
      );

      res.status(500).json({
        error: 'Failed to rotate token',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/external-agent/api-docs/openapi.json
 * Get OpenAPI documentation
 */
router.get('/api-docs/openapi.json', async (req: Request, res: Response) => {
  try {
    const openapiPath = path.join(__dirname, '../docs/openapi.json');

    if (!fs.existsSync(openapiPath)) {
      return res.status(404).json({
        error: 'Documentation not found',
        message: 'OpenAPI documentation is not available',
      });
    }

    const openapi = JSON.parse(fs.readFileSync(openapiPath, 'utf-8'));
    res.status(200).json(openapi);
  } catch (error: any) {
    console.error('Error loading OpenAPI docs:', error);
    res.status(500).json({
      error: 'Failed to load documentation',
      message: error.message,
    });
  }
});

/**
 * GET /api/external-agent/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    service: 'external-agent-api',
  });
});

export default router;
