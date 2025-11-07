// =====================================================
// ANTHROPIC PROVIDER ADAPTER
// Sprint 67 Track A: Multi-LLM Router
// =====================================================

import Anthropic from '@anthropic-ai/sdk';
import type {
  ILLMProvider,
  GenerateOptions,
  GenerateResponse,
  ProviderConfig,
  LatencyEntry,
} from '../types';
import { LLMProvider as ProviderEnum } from '../types';

/**
 * Anthropic Claude provider adapter
 */
export class AnthropicProvider implements ILLMProvider {
  public readonly provider = ProviderEnum.ANTHROPIC;
  public readonly defaultModel: string;

  private client: Anthropic;
  private latencyHistory: LatencyEntry[] = [];
  private readonly maxLatencyHistory = 100;

  constructor(config: ProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeout || 60000,
    });

    this.defaultModel = config.defaultModel || 'claude-3-5-sonnet-20241022';
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Simple health check: create a minimal message
      const response = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return response.content.length > 0;
    } catch (error) {
      console.error('[AnthropicProvider] Availability check failed:', error);
      return false;
    }
  }

  /**
   * Generate completion
   */
  async generate(options: GenerateOptions): Promise<GenerateResponse> {
    const startTime = Date.now();
    const model = options.model || this.defaultModel;

    try {
      // Extract system message if present
      const systemMessage = options.messages.find((msg) => msg.role === 'system');
      const conversationMessages = options.messages.filter((msg) => msg.role !== 'system');

      // Anthropic requires messages to alternate user/assistant
      // Convert our messages to Anthropic format
      const anthropicMessages = conversationMessages.map((msg) => ({
        role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: msg.content,
      }));

      const response = await this.client.messages.create({
        model,
        max_tokens: options.maxTokens ?? 2000,
        temperature: options.temperature ?? 0.7,
        system: systemMessage?.content,
        messages: anthropicMessages,
      });

      const latencyMs = Date.now() - startTime;

      // Extract text content from response
      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      if (!content) {
        throw new Error('No content returned from Anthropic');
      }

      // Track latency
      this.trackLatency({
        provider: this.provider,
        timestamp: Date.now(),
        latencyMs,
        model,
        success: true,
      });

      // Calculate tokens and cost
      const tokensUsed = {
        prompt: response.usage.input_tokens,
        completion: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      };

      const estimatedCost = this.calculateCost(model, tokensUsed.total);

      return {
        content,
        provider: this.provider,
        model,
        tokensUsed,
        latencyMs,
        estimatedCost,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      // Track failed latency
      this.trackLatency({
        provider: this.provider,
        timestamp: Date.now(),
        latencyMs,
        model,
        success: false,
      });

      throw error;
    }
  }

  /**
   * Get recent average latency
   */
  getAverageLatency(): number {
    if (this.latencyHistory.length === 0) return 0;

    const successfulRequests = this.latencyHistory.filter((entry) => entry.success);
    if (successfulRequests.length === 0) return 0;

    const sum = successfulRequests.reduce((acc, entry) => acc + entry.latencyMs, 0);
    return sum / successfulRequests.length;
  }

  /**
   * Get estimated cost per 1k tokens
   * Pricing as of 2024 (approximate)
   */
  getCostPer1kTokens(model: string): number {
    const pricing: Record<string, number> = {
      'claude-3-5-sonnet-20241022': 0.003, // $0.003 per 1k input tokens
      'claude-3-5-sonnet-20240620': 0.003,
      'claude-3-opus-20240229': 0.015,
      'claude-3-sonnet-20240229': 0.003,
      'claude-3-haiku-20240307': 0.00025,
    };

    return pricing[model] || pricing['claude-3-5-sonnet-20241022'];
  }

  /**
   * Calculate estimated cost
   */
  private calculateCost(model: string, totalTokens: number): number {
    const costPer1k = this.getCostPer1kTokens(model);
    return (totalTokens / 1000) * costPer1k;
  }

  /**
   * Track latency entry
   */
  private trackLatency(entry: LatencyEntry): void {
    this.latencyHistory.push(entry);

    // Keep only recent entries
    if (this.latencyHistory.length > this.maxLatencyHistory) {
      this.latencyHistory = this.latencyHistory.slice(-this.maxLatencyHistory);
    }
  }
}
