// =====================================================
// LLM PROVIDER REGISTRY
// Sprint 67 Track A: Multi-LLM Router
// =====================================================

import type { ILLMProvider, LLMProvider, ProviderConfig } from './types';
import { LLMProvider as ProviderEnum } from './types';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';

/**
 * Provider registry singleton
 */
class ProviderRegistry {
  private providers: Map<LLMProvider, ILLMProvider> = new Map();
  private initialized = false;

  /**
   * Initialize registry with configurations
   */
  initialize(configs: ProviderConfig[]): void {
    if (this.initialized) {
      console.warn('[ProviderRegistry] Already initialized, skipping');
      return;
    }

    for (const config of configs) {
      if (!config.enabled) {
        console.log(`[ProviderRegistry] Skipping disabled provider: ${config.provider}`);
        continue;
      }

      try {
        const provider = this.createProvider(config);
        this.providers.set(config.provider, provider);
        console.log(`[ProviderRegistry] Initialized provider: ${config.provider}`);
      } catch (error) {
        console.error(`[ProviderRegistry] Failed to initialize ${config.provider}:`, error);
      }
    }

    this.initialized = true;
  }

  /**
   * Get provider client
   */
  getProvider(provider: LLMProvider): ILLMProvider | undefined {
    return this.providers.get(provider);
  }

  /**
   * Get all initialized providers
   */
  getAllProviders(): ILLMProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get enabled provider names
   */
  getEnabledProviders(): LLMProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if provider is registered
   */
  hasProvider(provider: LLMProvider): boolean {
    return this.providers.has(provider);
  }

  /**
   * Reset registry (for testing)
   */
  reset(): void {
    this.providers.clear();
    this.initialized = false;
  }

  /**
   * Create provider instance from config
   */
  private createProvider(config: ProviderConfig): ILLMProvider {
    switch (config.provider) {
      case ProviderEnum.OPENAI:
        return new OpenAIProvider(config);
      case ProviderEnum.ANTHROPIC:
        return new AnthropicProvider(config);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }
}

// Export singleton instance
export const providerRegistry = new ProviderRegistry();

/**
 * Helper function to get provider client
 */
export function getProvider(provider: LLMProvider): ILLMProvider | undefined {
  return providerRegistry.getProvider(provider);
}

/**
 * Helper function to get all providers
 */
export function getAllProviders(): ILLMProvider[] {
  return providerRegistry.getAllProviders();
}
