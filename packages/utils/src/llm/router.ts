// =====================================================
// LLM ROUTER - Multi-Provider with Strategies
// Sprint 67 Track A: Multi-LLM Router
// =====================================================

import type {
  GenerateOptions,
  GenerateResponse,
  RouterConfig,
  ILLMProvider,
  LLMProvider,
} from './types';
import { RoutingStrategy, AllProvidersFailedError, ProviderUnavailableError } from './types';
import { providerRegistry, getAllProviders } from './registry';

/**
 * LLM Router - manages provider selection and fallback
 */
export class LLMRouter {
  private config: RouterConfig;

  constructor(config: RouterConfig) {
    this.config = config;
    providerRegistry.initialize(config.providers);
  }

  /**
   * Generate completion with automatic routing and fallback
   */
  async generate(options: GenerateOptions): Promise<GenerateResponse> {
    const strategy = options.strategy || this.config.defaultStrategy;
    const enableRetry = options.enableRetry ?? true;
    const maxRetries = options.maxRetries ?? this.config.maxRetries;

    // If force provider is set, use only that provider
    if (options.forceProvider) {
      return this.executeWithRetry(
        options.forceProvider,
        options,
        maxRetries,
        enableRetry
      );
    }

    // Select providers based on strategy
    const providers = this.selectProviders(strategy);

    if (providers.length === 0) {
      throw new AllProvidersFailedError('No providers available');
    }

    // Try each provider in order
    const errors: Array<{ provider: LLMProvider; error: Error }> = [];

    for (const provider of providers) {
      try {
        console.log(`[LLMRouter] Attempting provider: ${provider.provider} (${strategy})`);

        const response = await this.executeWithRetry(
          provider.provider,
          options,
          maxRetries,
          enableRetry
        );

        console.log(
          `[LLMRouter] Success with ${provider.provider} | ` +
            `Latency: ${response.latencyMs}ms | ` +
            `Tokens: ${response.tokensUsed.total} | ` +
            `Cost: $${response.estimatedCost?.toFixed(6) || '0'}`
        );

        return response;
      } catch (error) {
        console.error(`[LLMRouter] Provider ${provider.provider} failed:`, error);
        errors.push({
          provider: provider.provider,
          error: error instanceof Error ? error : new Error(String(error)),
        });

        // If fallback is disabled, throw immediately
        if (!this.config.enableFallback) {
          throw error;
        }

        // Continue to next provider
        console.log(`[LLMRouter] Falling back to next provider...`);
      }
    }

    // All providers failed
    const errorMessage = errors
      .map((e) => `${e.provider}: ${e.error.message}`)
      .join('; ');
    throw new AllProvidersFailedError(`All providers failed: ${errorMessage}`);
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry(
    providerType: LLMProvider,
    options: GenerateOptions,
    maxRetries: number,
    enableRetry: boolean
  ): Promise<GenerateResponse> {
    const provider = providerRegistry.getProvider(providerType);

    if (!provider) {
      throw new ProviderUnavailableError(providerType);
    }

    let lastError: Error | undefined;
    const attempts = enableRetry ? maxRetries : 1;

    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateRetryDelay(attempt);
          console.log(
            `[LLMRouter] Retry ${attempt}/${maxRetries} for ${providerType} after ${delay}ms`
          );
          await this.sleep(delay);
        }

        return await provider.generate(options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(
          `[LLMRouter] Attempt ${attempt + 1}/${attempts} failed for ${providerType}:`,
          error
        );
      }
    }

    throw (
      lastError || new Error(`Failed after ${attempts} attempts with ${providerType}`)
    );
  }

  /**
   * Select providers based on routing strategy
   */
  private selectProviders(strategy: RoutingStrategy): ILLMProvider[] {
    const providers = getAllProviders();

    if (providers.length === 0) {
      return [];
    }

    switch (strategy) {
      case RoutingStrategy.LATENCY_FIRST:
        return this.sortByLatency(providers);

      case RoutingStrategy.COST_FIRST:
        return this.sortByCost(providers);

      case RoutingStrategy.FORCED_PROVIDER:
        // Should not reach here, handled in generate()
        return providers;

      default:
        return providers;
    }
  }

  /**
   * Sort providers by average latency (lowest first)
   */
  private sortByLatency(providers: ILLMProvider[]): ILLMProvider[] {
    return [...providers].sort((a, b) => {
      const latencyA = a.getAverageLatency() || Infinity;
      const latencyB = b.getAverageLatency() || Infinity;
      return latencyA - latencyB;
    });
  }

  /**
   * Sort providers by cost (lowest first)
   */
  private sortByCost(providers: ILLMProvider[]): ILLMProvider[] {
    return [...providers].sort((a, b) => {
      const costA = a.getCostPer1kTokens(a.defaultModel);
      const costB = b.getCostPer1kTokens(b.defaultModel);
      return costA - costB;
    });
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay;
    return Math.min(baseDelay * Math.pow(2, attempt), 10000); // Cap at 10s
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Default configuration from environment
const defaultConfig: RouterConfig = {
  defaultStrategy: (process.env.LLM_ROUTING_STRATEGY as RoutingStrategy) ||
    RoutingStrategy.LATENCY_FIRST,
  providers: [],
  enableFallback: true,
  maxRetries: 2,
  retryDelay: 1000,
  trackLatency: true,
};

// Singleton router instance
let routerInstance: LLMRouter | null = null;

/**
 * Initialize router with configuration
 */
export function initializeRouter(config?: Partial<RouterConfig>): LLMRouter {
  const mergedConfig = {
    ...defaultConfig,
    ...config,
    providers: config?.providers || [],
  };

  routerInstance = new LLMRouter(mergedConfig);
  return routerInstance;
}

/**
 * Get router instance
 */
export function getRouter(): LLMRouter {
  if (!routerInstance) {
    throw new Error('Router not initialized. Call initializeRouter() first.');
  }
  return routerInstance;
}

/**
 * Convenience function for generating completions
 */
export async function generate(options: GenerateOptions): Promise<GenerateResponse> {
  const router = getRouter();
  return router.generate(options);
}
