// =====================================================
// LLM TYPES - Multi-Provider Abstractions
// Sprint 67 Track A: Multi-LLM Router
// =====================================================

/**
 * Supported LLM providers
 */
export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
}

/**
 * Routing strategies for provider selection
 */
export enum RoutingStrategy {
  /** Use specific provider without fallback */
  FORCED_PROVIDER = 'forcedProvider',
  /** Select provider with lowest latency based on recent requests */
  LATENCY_FIRST = 'latencyFirst',
  /** Select provider with lowest cost per token */
  COST_FIRST = 'costFirst',
}

/**
 * Message role in conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Single message in conversation
 */
export interface LLMMessage {
  role: MessageRole;
  content: string;
}

/**
 * Generation request options
 */
export interface GenerateOptions {
  /** Messages to send to LLM */
  messages: LLMMessage[];
  /** Model to use (provider-specific) */
  model?: string;
  /** Temperature (0-2, lower = more deterministic) */
  temperature?: number;
  /** Max tokens to generate */
  maxTokens?: number;
  /** Force JSON response format */
  jsonMode?: boolean;
  /** Routing strategy (default: latencyFirst) */
  strategy?: RoutingStrategy;
  /** Force specific provider (overrides strategy) */
  forceProvider?: LLMProvider;
  /** Enable retry on failure */
  enableRetry?: boolean;
  /** Max retry attempts */
  maxRetries?: number;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Generation response
 */
export interface GenerateResponse {
  /** Generated content */
  content: string;
  /** Provider that handled the request */
  provider: LLMProvider;
  /** Model that was used */
  model: string;
  /** Tokens used in request */
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  /** Latency in milliseconds */
  latencyMs: number;
  /** Estimated cost in USD */
  estimatedCost?: number;
}

/**
 * Provider-specific configuration
 */
export interface ProviderConfig {
  /** Provider type */
  provider: LLMProvider;
  /** API key */
  apiKey: string;
  /** Default model */
  defaultModel: string;
  /** Enable this provider */
  enabled: boolean;
  /** Priority (higher = preferred) */
  priority?: number;
  /** Base URL override (optional) */
  baseUrl?: string;
  /** Timeout in ms */
  timeout?: number;
}

/**
 * Router configuration
 */
export interface RouterConfig {
  /** Default routing strategy */
  defaultStrategy: RoutingStrategy;
  /** Provider configurations */
  providers: ProviderConfig[];
  /** Enable automatic fallback */
  enableFallback: boolean;
  /** Max retry attempts */
  maxRetries: number;
  /** Retry delay in ms */
  retryDelay: number;
  /** Enable latency tracking */
  trackLatency: boolean;
}

/**
 * Provider client interface
 */
export interface ILLMProvider {
  /** Provider type */
  readonly provider: LLMProvider;

  /** Default model */
  readonly defaultModel: string;

  /** Check if provider is available */
  isAvailable(): Promise<boolean>;

  /** Generate completion */
  generate(options: GenerateOptions): Promise<GenerateResponse>;

  /** Get recent average latency */
  getAverageLatency(): number;

  /** Get estimated cost per 1k tokens */
  getCostPer1kTokens(model: string): number;
}

/**
 * Latency tracking entry
 */
export interface LatencyEntry {
  provider: LLMProvider;
  timestamp: number;
  latencyMs: number;
  model: string;
  success: boolean;
}

/**
 * Router error types
 */
export class LLMRouterError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: LLMProvider,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'LLMRouterError';
  }
}

export class ProviderUnavailableError extends LLMRouterError {
  constructor(provider: LLMProvider, originalError?: Error) {
    super(
      `Provider ${provider} is unavailable`,
      'PROVIDER_UNAVAILABLE',
      provider,
      originalError
    );
    this.name = 'ProviderUnavailableError';
  }
}

export class AllProvidersFailedError extends LLMRouterError {
  constructor(message: string) {
    super(message, 'ALL_PROVIDERS_FAILED');
    this.name = 'AllProvidersFailedError';
  }
}
