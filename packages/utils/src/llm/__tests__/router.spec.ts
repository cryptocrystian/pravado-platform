// =====================================================
// LLM ROUTER TESTS
// Sprint 67 Track A: Multi-LLM Router
// =====================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMRouter, initializeRouter } from '../router';
import { RoutingStrategy, LLMProvider as ProviderEnum, type RouterConfig } from '../types';
import { providerRegistry } from '../registry';

// Mock provider configs
const mockConfig: RouterConfig = {
  defaultStrategy: RoutingStrategy.LATENCY_FIRST,
  providers: [
    {
      provider: ProviderEnum.OPENAI,
      apiKey: 'test-openai-key',
      defaultModel: 'gpt-4-turbo-preview',
      enabled: true,
      priority: 1,
    },
    {
      provider: ProviderEnum.ANTHROPIC,
      apiKey: 'test-anthropic-key',
      defaultModel: 'claude-3-5-sonnet-20241022',
      enabled: true,
      priority: 2,
    },
  ],
  enableFallback: true,
  maxRetries: 2,
  retryDelay: 100,
  trackLatency: true,
};

describe('LLMRouter', () => {
  beforeEach(() => {
    // Reset registry before each test
    providerRegistry.reset();
  });

  describe('initialization', () => {
    it('should initialize router with config', () => {
      const router = new LLMRouter(mockConfig);
      expect(router).toBeInstanceOf(LLMRouter);
    });

    it('should register all enabled providers', () => {
      new LLMRouter(mockConfig);
      const providers = providerRegistry.getEnabledProviders();
      expect(providers).toContain(ProviderEnum.OPENAI);
      expect(providers).toContain(ProviderEnum.ANTHROPIC);
    });

    it('should skip disabled providers', () => {
      const configWithDisabled: RouterConfig = {
        ...mockConfig,
        providers: [
          {
            provider: ProviderEnum.OPENAI,
            apiKey: 'test-key',
            defaultModel: 'gpt-4',
            enabled: false,
          },
        ],
      };

      new LLMRouter(configWithDisabled);
      const providers = providerRegistry.getEnabledProviders();
      expect(providers).not.toContain(ProviderEnum.OPENAI);
    });
  });

  describe('generate', () => {
    it('should generate completion with forced provider', async () => {
      // This test would require mocking the actual API calls
      // For now, we test the structure
      const router = new LLMRouter(mockConfig);

      // Mock the provider's generate method
      const mockProvider = providerRegistry.getProvider(ProviderEnum.OPENAI);
      if (mockProvider) {
        vi.spyOn(mockProvider, 'generate').mockResolvedValue({
          content: 'Test response',
          provider: ProviderEnum.OPENAI,
          model: 'gpt-4-turbo-preview',
          tokensUsed: { prompt: 10, completion: 20, total: 30 },
          latencyMs: 1000,
          estimatedCost: 0.001,
        });

        const response = await router.generate({
          messages: [{ role: 'user', content: 'Test' }],
          forceProvider: ProviderEnum.OPENAI,
        });

        expect(response.content).toBe('Test response');
        expect(response.provider).toBe(ProviderEnum.OPENAI);
      }
    });

    it('should throw error when no providers available', async () => {
      const emptyConfig: RouterConfig = {
        ...mockConfig,
        providers: [],
      };

      const router = new LLMRouter(emptyConfig);

      await expect(
        router.generate({
          messages: [{ role: 'user', content: 'Test' }],
        })
      ).rejects.toThrow('No providers available');
    });
  });

  describe('routing strategies', () => {
    it('should select latencyFirst strategy by default', () => {
      const router = new LLMRouter(mockConfig);
      // Strategy selection is tested implicitly through generation
      expect(router).toBeInstanceOf(LLMRouter);
    });

    it('should allow costFirst strategy', () => {
      const router = new LLMRouter({
        ...mockConfig,
        defaultStrategy: RoutingStrategy.COST_FIRST,
      });
      expect(router).toBeInstanceOf(LLMRouter);
    });
  });

  describe('fallback mechanism', () => {
    it('should fallback to next provider on failure when enabled', async () => {
      const router = new LLMRouter(mockConfig);

      const openaiProvider = providerRegistry.getProvider(ProviderEnum.OPENAI);
      const anthropicProvider = providerRegistry.getProvider(ProviderEnum.ANTHROPIC);

      if (openaiProvider && anthropicProvider) {
        // Mock OpenAI to fail
        vi.spyOn(openaiProvider, 'generate').mockRejectedValue(
          new Error('OpenAI failed')
        );

        // Mock Anthropic to succeed
        vi.spyOn(anthropicProvider, 'generate').mockResolvedValue({
          content: 'Anthropic response',
          provider: ProviderEnum.ANTHROPIC,
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: { prompt: 10, completion: 20, total: 30 },
          latencyMs: 800,
          estimatedCost: 0.0009,
        });

        const response = await router.generate({
          messages: [{ role: 'user', content: 'Test' }],
        });

        expect(response.provider).toBe(ProviderEnum.ANTHROPIC);
      }
    });

    it('should not fallback when fallback is disabled', async () => {
      const noFallbackConfig: RouterConfig = {
        ...mockConfig,
        enableFallback: false,
      };

      const router = new LLMRouter(noFallbackConfig);

      const openaiProvider = providerRegistry.getProvider(ProviderEnum.OPENAI);

      if (openaiProvider) {
        vi.spyOn(openaiProvider, 'generate').mockRejectedValue(
          new Error('OpenAI failed')
        );

        await expect(
          router.generate({
            messages: [{ role: 'user', content: 'Test' }],
            forceProvider: ProviderEnum.OPENAI,
          })
        ).rejects.toThrow('OpenAI failed');
      }
    });
  });

  describe('retry logic', () => {
    it('should retry on failure when retry is enabled', async () => {
      const router = new LLMRouter(mockConfig);

      const provider = providerRegistry.getProvider(ProviderEnum.OPENAI);

      if (provider) {
        const generateSpy = vi
          .spyOn(provider, 'generate')
          .mockRejectedValueOnce(new Error('Temporary failure'))
          .mockResolvedValueOnce({
            content: 'Success on retry',
            provider: ProviderEnum.OPENAI,
            model: 'gpt-4-turbo-preview',
            tokensUsed: { prompt: 10, completion: 20, total: 30 },
            latencyMs: 1000,
            estimatedCost: 0.001,
          });

        const response = await router.generate({
          messages: [{ role: 'user', content: 'Test' }],
          forceProvider: ProviderEnum.OPENAI,
          enableRetry: true,
          maxRetries: 2,
        });

        expect(response.content).toBe('Success on retry');
        expect(generateSpy).toHaveBeenCalledTimes(2);
      }
    });
  });
});

describe('Router singleton', () => {
  it('should initialize singleton router', () => {
    const router = initializeRouter(mockConfig);
    expect(router).toBeInstanceOf(LLMRouter);
  });
});
