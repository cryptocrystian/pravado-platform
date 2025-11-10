// =====================================================
// ENRICHMENT PROVIDER INTERFACE
// Sprint 68 Track C
// =====================================================
// Pluggable architecture for contact enrichment providers

export interface EnrichmentResult {
  success: boolean;
  provider: string;
  data?: {
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    bio?: string;
    location?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
    companyDomain?: string;
    employeeCount?: number;
    industry?: string;
    foundedYear?: number;
    technologies?: string[];
  };
  error?: string;
  metadata?: {
    creditsUsed?: number;
    responseTime?: number;
    cacheHit?: boolean;
  };
}

export interface EnrichmentQuery {
  email?: string;
  domain?: string;
  name?: string;
  company?: string;
}

/**
 * Base interface for all enrichment providers
 */
export interface EnrichmentProvider {
  readonly name: string;
  readonly priority: number; // Lower = higher priority

  /**
   * Check if provider is configured and available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Enrich contact/company data
   */
  enrich(query: EnrichmentQuery): Promise<EnrichmentResult>;

  /**
   * Get remaining API credits/quota
   */
  getRemainingQuota?(): Promise<number | null>;
}

/**
 * Provider registry for managing multiple enrichment providers
 */
export class EnrichmentProviderRegistry {
  private providers: Map<string, EnrichmentProvider> = new Map();

  /**
   * Register a new provider
   */
  register(provider: EnrichmentProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Get a specific provider by name
   */
  getProvider(name: string): EnrichmentProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all available providers, sorted by priority
   */
  async getAvailableProviders(): Promise<EnrichmentProvider[]> {
    const available: EnrichmentProvider[] = [];

    for (const provider of this.providers.values()) {
      if (await provider.isAvailable()) {
        available.push(provider);
      }
    }

    // Sort by priority (lower number = higher priority)
    return available.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Try enrichment with fallback chain
   * Attempts providers in priority order until one succeeds
   */
  async enrichWithFallback(query: EnrichmentQuery): Promise<EnrichmentResult> {
    const providers = await this.getAvailableProviders();

    if (providers.length === 0) {
      return {
        success: false,
        provider: 'none',
        error: 'No enrichment providers available',
      };
    }

    const errors: string[] = [];

    for (const provider of providers) {
      try {
        const result = await provider.enrich(query);

        if (result.success && result.data) {
          return result;
        }

        if (result.error) {
          errors.push(`${provider.name}: ${result.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${provider.name}: ${errorMessage}`);
      }
    }

    return {
      success: false,
      provider: 'fallback-chain',
      error: `All providers failed: ${errors.join('; ')}`,
    };
  }
}

/**
 * Global registry instance
 */
export const enrichmentRegistry = new EnrichmentProviderRegistry();
