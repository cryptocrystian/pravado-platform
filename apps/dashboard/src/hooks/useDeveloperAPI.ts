// =====================================================
// DEVELOPER API HOOKS
// Sprint 55 Phase 5.2
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// =====================================================
// TYPES
// =====================================================

interface APIToken {
  tokenId: string;
  clientId: string;
  name: string;
  description?: string;
  tokenPrefix: string;
  accessLevel: string;
  rateLimitTier: string;
  scopes: any[];
  isActive: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}

interface UsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsByEndpoint: {
    endpoint: string;
    count: number;
    averageResponseTime: number;
  }[];
  requestsByStatus: {
    status: string;
    count: number;
  }[];
}

interface WebhookRegistration {
  webhookId: string;
  url: string;
  events: string[];
  isActive: boolean;
  totalDeliveries: number;
  failedDeliveries: number;
  lastDeliveryAt?: string;
}

interface WebhookStats {
  webhookId: string;
  totalAttempts: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageDeliveryTime: number;
  retryRate: number;
  deliveriesByEvent: {
    eventType: string;
    count: number;
    successRate: number;
  }[];
}

// =====================================================
// HOOKS
// =====================================================

/**
 * Hook for managing API keys
 */
export function useAPIKeys(clientId?: string) {
  const [tokens, setTokens] = useState<APIToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/developer/tokens`, {
        params: { clientId },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setTokens(response.data.tokens || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch tokens');
      console.error('Error fetching tokens:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return {
    tokens,
    loading,
    error,
    refetch: fetchTokens,
  };
}

/**
 * Hook for creating API tokens
 */
export function useCreateToken() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<{ token: string; tokenId: string } | null>(
    null
  );

  const createToken = useCallback(
    async (data: {
      clientId: string;
      organizationId: string;
      name: string;
      description?: string;
      accessLevel: string;
      scopes: any[];
      rateLimitTier?: string;
      expiresIn?: number;
    }) => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.post(
          `${API_BASE_URL}/developer/tokens`,
          data,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            },
          }
        );

        setCreatedToken({
          token: response.data.token,
          tokenId: response.data.tokenId,
        });

        return response.data;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to create token';
        setError(errorMsg);
        console.error('Error creating token:', err);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    createToken,
    loading,
    error,
    createdToken,
    clearCreatedToken: () => setCreatedToken(null),
  };
}

/**
 * Hook for rotating API tokens
 */
export function useRotateToken() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rotateToken = useCallback(
    async (tokenId: string, expiresIn?: number) => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.post(
          `${API_BASE_URL}/external-agent/rotate-token`,
          { tokenId, expiresIn },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            },
          }
        );

        return response.data;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to rotate token';
        setError(errorMsg);
        console.error('Error rotating token:', err);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    rotateToken,
    loading,
    error,
  };
}

/**
 * Hook for revoking API tokens
 */
export function useRevokeToken() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revokeToken = useCallback(
    async (tokenId: string, reason?: string) => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.post(
          `${API_BASE_URL}/developer/tokens/${tokenId}/revoke`,
          { reason },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            },
          }
        );

        return response.data;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to revoke token';
        setError(errorMsg);
        console.error('Error revoking token:', err);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    revokeToken,
    loading,
    error,
  };
}

/**
 * Hook for fetching usage analytics
 */
export function useUsageAnalytics(
  clientId?: string,
  startDate?: Date,
  endDate?: Date
) {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/developer/analytics`, {
        params: {
          clientId,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setMetrics(response.data.metrics);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch analytics');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId, startDate, endDate]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics,
  };
}

/**
 * Hook for managing webhooks
 */
export function useWebhooks(clientId?: string) {
  const [webhooks, setWebhooks] = useState<WebhookRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/developer/webhooks`, {
        params: { clientId },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setWebhooks(response.data.webhooks || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch webhooks');
      console.error('Error fetching webhooks:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  return {
    webhooks,
    loading,
    error,
    refetch: fetchWebhooks,
  };
}

/**
 * Hook for registering webhooks
 */
export function useRegisterWebhook() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerWebhook = useCallback(
    async (data: {
      url: string;
      events: string[];
      secret?: string;
      headers?: Record<string, string>;
    }) => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.post(
          `${API_BASE_URL}/external-agent/register-webhook`,
          data,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            },
          }
        );

        return response.data;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to register webhook';
        setError(errorMsg);
        console.error('Error registering webhook:', err);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    registerWebhook,
    loading,
    error,
  };
}

/**
 * Hook for fetching webhook statistics
 */
export function useWebhookStats(webhookId?: string) {
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!webhookId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${API_BASE_URL}/developer/webhooks/${webhookId}/stats`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setStats(response.data.stats);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch webhook stats');
      console.error('Error fetching webhook stats:', err);
    } finally {
      setLoading(false);
    }
  }, [webhookId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

/**
 * Hook for fetching OpenAPI schema
 */
export function useOpenAPISchema() {
  const [schema, setSchema] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(
          `${API_BASE_URL}/external-agent/api-docs/openapi.json`
        );

        setSchema(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch OpenAPI schema');
        console.error('Error fetching OpenAPI schema:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchema();
  }, []);

  return {
    schema,
    loading,
    error,
  };
}

/**
 * Hook for retrying failed webhook deliveries
 */
export function useRetryWebhook() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retryWebhook = useCallback(
    async (webhookId: string, attemptId: string) => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.post(
          `${API_BASE_URL}/developer/webhooks/${webhookId}/retry`,
          { attemptId },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            },
          }
        );

        return response.data;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to retry webhook';
        setError(errorMsg);
        console.error('Error retrying webhook:', err);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    retryWebhook,
    loading,
    error,
  };
}

/**
 * Hook for updating webhook configuration
 */
export function useUpdateWebhook() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateWebhook = useCallback(
    async (
      webhookId: string,
      updates: {
        url?: string;
        events?: string[];
        isActive?: boolean;
        headers?: Record<string, string>;
      }
    ) => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.patch(
          `${API_BASE_URL}/developer/webhooks/${webhookId}`,
          updates,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            },
          }
        );

        return response.data;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to update webhook';
        setError(errorMsg);
        console.error('Error updating webhook:', err);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    updateWebhook,
    loading,
    error,
  };
}
