// =====================================================
// EXTERNAL API AUTHENTICATION SERVICE
// Sprint 54 Phase 5.1
// =====================================================

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type {
  CreateAPITokenInput,
  ValidateAPITokenInput,
  RevokeAPITokenInput,
  RotateAPITokenInput,
  RegisterClientInput,
  CreateTokenResponse,
  ValidateTokenResponse,
  RotateTokenResponse,
  RegisteredClient,
  ExternalAPIToken,
  RateLimitStatus,
  RateLimitTier,
  AccessLevel,
  APIAccessScope,
} from '@pravado/types';
import { db } from '../database';

/**
 * External API Authentication Service
 *
 * Handles API token generation, validation, revocation, and rate limiting
 * for third-party applications accessing the agent platform.
 */
class ExternalAPIAuthService {
  private readonly TOKEN_LENGTH = 32; // bytes (64 hex chars)
  private readonly PREFIX_LENGTH = 8;

  // Rate limit configurations by tier
  private readonly RATE_LIMITS: Record<
    RateLimitTier,
    {
      requestsPerMinute: number;
      requestsPerHour: number;
      requestsPerDay: number;
      burstLimit: number;
    }
  > = {
    free: {
      requestsPerMinute: 10,
      requestsPerHour: 100,
      requestsPerDay: 1000,
      burstLimit: 5,
    },
    basic: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      burstLimit: 10,
    },
    professional: {
      requestsPerMinute: 300,
      requestsPerHour: 10000,
      requestsPerDay: 100000,
      burstLimit: 50,
    },
    enterprise: {
      requestsPerMinute: 1000,
      requestsPerHour: 50000,
      requestsPerDay: 1000000,
      burstLimit: 100,
    },
    unlimited: {
      requestsPerMinute: 999999,
      requestsPerHour: 999999,
      requestsPerDay: 999999,
      burstLimit: 999999,
    },
  };

  // =====================================================
  // CLIENT REGISTRATION
  // =====================================================

  /**
   * Register a new API client
   */
  async registerClient(input: RegisterClientInput): Promise<RegisteredClient> {
    const {
      organizationId,
      name,
      description,
      clientType,
      allowedOrigins,
      allowedIPs,
      webhookUrl,
      createdBy,
      metadata = {},
    } = input;

    const clientId = uuidv4();

    const result = await db.query(
      `INSERT INTO registered_clients (
        client_id, organization_id, name, description, client_type,
        allowed_origins, allowed_ips, webhook_url, created_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        clientId,
        organizationId,
        name,
        description || null,
        clientType,
        allowedOrigins || null,
        allowedIPs || null,
        webhookUrl || null,
        createdBy,
        JSON.stringify(metadata),
      ]
    );

    return this.mapClientRow(result.rows[0]);
  }

  /**
   * Get client by ID
   */
  async getClientById(
    clientId: string,
    organizationId: string
  ): Promise<RegisteredClient | null> {
    const result = await db.query(
      `SELECT * FROM registered_clients
       WHERE client_id = $1 AND organization_id = $2`,
      [clientId, organizationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapClientRow(result.rows[0]);
  }

  // =====================================================
  // TOKEN MANAGEMENT
  // =====================================================

  /**
   * Create a new API token
   */
  async createAPIToken(input: CreateAPITokenInput): Promise<CreateTokenResponse> {
    const {
      organizationId,
      clientId,
      name,
      description,
      accessLevel,
      scopes,
      rateLimitTier = 'basic',
      expiresIn,
      metadata = {},
    } = input;

    // Generate secure token
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const tokenPrefix = this.extractPrefix(token);
    const tokenId = uuidv4();

    // Calculate expiration
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000)
      : null;

    // Get rate limit config for tier
    const rateLimitConfig = this.RATE_LIMITS[rateLimitTier];

    // Insert token
    await db.query(
      `INSERT INTO external_api_tokens (
        token_id, client_id, organization_id, token_hash, token_prefix,
        name, description, access_level, scopes, rate_limit_tier,
        rate_limit_config, expires_at, created_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        tokenId,
        clientId,
        organizationId,
        tokenHash,
        tokenPrefix,
        name,
        description || null,
        accessLevel,
        JSON.stringify(scopes),
        rateLimitTier,
        JSON.stringify(rateLimitConfig),
        expiresAt,
        null, // createdBy - would come from auth context
        JSON.stringify(metadata),
      ]
    );

    return {
      success: true,
      token, // Only time we return the plain text token
      tokenId,
      tokenPrefix,
      expiresAt: expiresAt || undefined,
      rateLimitTier,
      scopes,
    };
  }

  /**
   * Validate API token
   */
  async validateAPIToken(
    input: ValidateAPITokenInput
  ): Promise<ValidateTokenResponse> {
    const { token, requiredScopes, endpoint, method } = input;

    try {
      // Hash the provided token
      const tokenHash = this.hashToken(token);

      // Look up token in database
      const result = await db.query(
        `SELECT t.*, c.organization_id, c.is_active as client_active
         FROM external_api_tokens t
         INNER JOIN registered_clients c ON t.client_id = c.client_id
         WHERE t.token_hash = $1`,
        [tokenHash]
      );

      if (result.rows.length === 0) {
        return {
          valid: false,
          errorMessage: 'Invalid token',
        };
      }

      const tokenData = result.rows[0];

      // Check if token is active
      if (!tokenData.is_active) {
        return {
          valid: false,
          errorMessage: 'Token has been revoked',
        };
      }

      // Check if client is active
      if (!tokenData.client_active) {
        return {
          valid: false,
          errorMessage: 'Client has been deactivated',
        };
      }

      // Check if token is expired
      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        return {
          valid: false,
          errorMessage: 'Token has expired',
        };
      }

      // Check scopes if required
      const tokenScopes = tokenData.scopes as APIAccessScope[];
      if (requiredScopes && !this.checkScopes(tokenScopes, requiredScopes)) {
        return {
          valid: false,
          errorMessage: 'Insufficient permissions',
        };
      }

      // Check rate limits
      const rateLimitStatus = await this.checkRateLimit(
        tokenData.client_id,
        tokenData.token_id
      );

      if (rateLimitStatus.isLimited) {
        return {
          valid: false,
          errorMessage: 'Rate limit exceeded',
          rateLimitStatus,
        };
      }

      // Update last used timestamp
      await this.updateLastUsed(tokenData.token_id);

      // Increment rate limit counter
      await this.incrementRateLimit(tokenData.client_id, tokenData.token_id);

      return {
        valid: true,
        clientId: tokenData.client_id,
        organizationId: tokenData.organization_id,
        accessLevel: tokenData.access_level,
        scopes: tokenScopes,
        rateLimitStatus,
      };
    } catch (error: any) {
      console.error('Error validating token:', error);
      return {
        valid: false,
        errorMessage: 'Token validation failed',
      };
    }
  }

  /**
   * Revoke API token
   */
  async revokeAPIToken(input: RevokeAPITokenInput): Promise<{ success: boolean }> {
    const { tokenId, revokedBy, reason } = input;

    await db.query(
      `UPDATE external_api_tokens
       SET is_active = false,
           revoked_at = NOW(),
           revoked_by = $1,
           metadata = jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{revocationReason}',
             $2
           )
       WHERE token_id = $3`,
      [revokedBy, JSON.stringify(reason || 'No reason provided'), tokenId]
    );

    return { success: true };
  }

  /**
   * Rotate API token
   */
  async rotateAPIToken(input: RotateAPITokenInput): Promise<RotateTokenResponse> {
    const { tokenId, expiresIn } = input;

    // Get old token data
    const oldTokenResult = await db.query(
      `SELECT * FROM external_api_tokens WHERE token_id = $1`,
      [tokenId]
    );

    if (oldTokenResult.rows.length === 0) {
      throw new Error('Token not found');
    }

    const oldToken = oldTokenResult.rows[0];

    // Generate new token
    const newToken = this.generateToken();
    const newTokenHash = this.hashToken(newToken);
    const newTokenPrefix = this.extractPrefix(newToken);
    const newTokenId = uuidv4();

    // Calculate expiration
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000)
      : oldToken.expires_at;

    // Insert new token with same permissions
    await db.query(
      `INSERT INTO external_api_tokens (
        token_id, client_id, organization_id, token_hash, token_prefix,
        name, description, access_level, scopes, rate_limit_tier,
        rate_limit_config, expires_at, created_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        newTokenId,
        oldToken.client_id,
        oldToken.organization_id,
        newTokenHash,
        newTokenPrefix,
        oldToken.name,
        oldToken.description,
        oldToken.access_level,
        oldToken.scopes,
        oldToken.rate_limit_tier,
        oldToken.rate_limit_config,
        expiresAt,
        oldToken.created_by,
        JSON.stringify({
          ...oldToken.metadata,
          rotatedFrom: tokenId,
          rotatedAt: new Date().toISOString(),
        }),
      ]
    );

    // Revoke old token
    await this.revokeAPIToken({
      tokenId,
      revokedBy: 'system',
      reason: 'Token rotated',
    });

    return {
      success: true,
      newToken,
      newTokenId,
      oldTokenId: tokenId,
      expiresAt: expiresAt || undefined,
    };
  }

  // =====================================================
  // RATE LIMITING
  // =====================================================

  /**
   * Check rate limit for a client
   */
  async checkRateLimit(
    clientId: string,
    tokenId: string
  ): Promise<RateLimitStatus> {
    const result = await db.query(
      `SELECT * FROM check_rate_limit($1, $2)`,
      [clientId, tokenId]
    );

    const row = result.rows[0];

    // Get rate limit tier and config
    const tokenResult = await db.query(
      `SELECT rate_limit_tier, rate_limit_config FROM external_api_tokens
       WHERE token_id = $1`,
      [tokenId]
    );

    const tokenData = tokenResult.rows[0];

    const resetMinute = new Date(Math.ceil(Date.now() / 60000) * 60000);
    const resetHour = new Date(Math.ceil(Date.now() / 3600000) * 3600000);
    const resetDay = new Date();
    resetDay.setHours(24, 0, 0, 0);

    return {
      clientId,
      tier: tokenData.rate_limit_tier,
      limits: {
        requestsPerMinute: row.limit_minute,
        requestsPerHour: row.limit_hour,
        requestsPerDay: row.limit_day,
        burstLimit: tokenData.rate_limit_config.burstLimit,
      },
      current: {
        requestsThisMinute: row.requests_this_minute,
        requestsThisHour: row.requests_this_hour,
        requestsThisDay: row.requests_this_day,
      },
      remaining: {
        requestsThisMinute: Math.max(0, row.limit_minute - row.requests_this_minute),
        requestsThisHour: Math.max(0, row.limit_hour - row.requests_this_hour),
        requestsThisDay: Math.max(0, row.limit_day - row.requests_this_day),
      },
      resetAt: {
        minute: resetMinute,
        hour: resetHour,
        day: resetDay,
      },
      isLimited: row.is_limited,
    };
  }

  /**
   * Increment rate limit counter
   */
  private async incrementRateLimit(
    clientId: string,
    tokenId: string
  ): Promise<void> {
    await db.query(`SELECT increment_rate_limit($1, $2)`, [clientId, tokenId]);
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    const randomBytes = crypto.randomBytes(this.TOKEN_LENGTH);
    const token = `pk_live_${randomBytes.toString('hex')}`;
    return token;
  }

  /**
   * Hash token using SHA-256
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Extract token prefix for display
   */
  private extractPrefix(token: string): string {
    return token.substring(0, this.PREFIX_LENGTH + 8); // "pk_live_" + 8 chars
  }

  /**
   * Check if token has required scopes
   */
  private checkScopes(
    tokenScopes: APIAccessScope[],
    requiredScopes: APIAccessScope[]
  ): boolean {
    for (const required of requiredScopes) {
      const hasScope = tokenScopes.some(
        (scope) =>
          scope.resource === required.resource &&
          required.actions.every((action) => scope.actions.includes(action))
      );

      if (!hasScope) {
        return false;
      }
    }

    return true;
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(tokenId: string): Promise<void> {
    await db.query(
      `UPDATE external_api_tokens
       SET last_used_at = NOW()
       WHERE token_id = $1`,
      [tokenId]
    );
  }

  /**
   * Map database row to RegisteredClient
   */
  private mapClientRow(row: any): RegisteredClient {
    return {
      clientId: row.client_id,
      organizationId: row.organization_id,
      name: row.name,
      description: row.description,
      clientType: row.client_type,
      allowedOrigins: row.allowed_origins,
      allowedIPs: row.allowed_ips,
      webhookUrl: row.webhook_url,
      isActive: row.is_active,
      createdAt: row.created_at,
      createdBy: row.created_by,
      metadata: row.metadata,
    };
  }

  /**
   * Get token by ID
   */
  async getTokenById(
    tokenId: string,
    organizationId: string
  ): Promise<ExternalAPIToken | null> {
    const result = await db.query(
      `SELECT * FROM external_api_tokens
       WHERE token_id = $1 AND organization_id = $2`,
      [tokenId, organizationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      tokenId: row.token_id,
      clientId: row.client_id,
      organizationId: row.organization_id,
      tokenHash: row.token_hash,
      tokenPrefix: row.token_prefix,
      name: row.name,
      description: row.description,
      accessLevel: row.access_level,
      scopes: row.scopes,
      rateLimitTier: row.rate_limit_tier,
      rateLimitConfig: row.rate_limit_config,
      isActive: row.is_active,
      expiresAt: row.expires_at,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at,
      createdBy: row.created_by,
      revokedAt: row.revoked_at,
      revokedBy: row.revoked_by,
      metadata: row.metadata,
    };
  }

  /**
   * List tokens for a client
   */
  async listClientTokens(
    clientId: string,
    organizationId: string
  ): Promise<ExternalAPIToken[]> {
    const result = await db.query(
      `SELECT * FROM external_api_tokens
       WHERE client_id = $1 AND organization_id = $2
       ORDER BY created_at DESC`,
      [clientId, organizationId]
    );

    return result.rows.map((row) => ({
      tokenId: row.token_id,
      clientId: row.client_id,
      organizationId: row.organization_id,
      tokenHash: row.token_hash,
      tokenPrefix: row.token_prefix,
      name: row.name,
      description: row.description,
      accessLevel: row.access_level,
      scopes: row.scopes,
      rateLimitTier: row.rate_limit_tier,
      rateLimitConfig: row.rate_limit_config,
      isActive: row.is_active,
      expiresAt: row.expires_at,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at,
      createdBy: row.created_by,
      revokedAt: row.revoked_at,
      revokedBy: row.revoked_by,
      metadata: row.metadata,
    }));
  }
}

// Export singleton instance
export const externalAPIAuthService = new ExternalAPIAuthService();
