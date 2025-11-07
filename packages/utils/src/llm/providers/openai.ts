// =====================================================
// OPENAI PROVIDER ADAPTER
// Sprint 67 Track A: Multi-LLM Router
// =====================================================

import OpenAI from 'openai';
import type {
  ILLMProvider,
  GenerateOptions,
  GenerateResponse,
  ProviderConfig,
  LatencyEntry,
} from '../types';
import { LLMProvider as ProviderEnum } from '../types';

/**
 * OpenAI provider adapter
 */
export class OpenAIProvider implements ILLMProvider {
  public readonly provider = ProviderEnum.OPENAI;
  public readonly defaultModel: string;

  private client: OpenAI;
  private latencyHistory: LatencyEntry[] = [];
  private readonly maxLatencyHistory = 100;

  constructor(config: ProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeout || 60000,
    });

    this.defaultModel = config.defaultModel || 'gpt-4-turbo-preview';
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Simple check: list models (lightweight operation)
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error('[OpenAIProvider] Availability check failed:', error);
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
      const completion = await this.client.chat.completions.create({
        model,
        messages: options.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        response_format: options.jsonMode ? { type: 'json_object' } : undefined,
      });

      const latencyMs = Date.now() - startTime;
      const content = completion.choices[0]?.message?.content || '';
      const usage = completion.usage;

      if (!content) {
        throw new Error('No content returned from OpenAI');
      }

      // Track latency
      this.trackLatency({
        provider: this.provider,
        timestamp: Date.now(),
        latencyMs,
        model,
        success: true,
      });

      // Calculate cost
      const estimatedCost = this.calculateCost(model, usage?.total_tokens || 0);

      return {
        content,
        provider: this.provider,
        model,
        tokensUsed: {
          prompt: usage?.prompt_tokens || 0,
          completion: usage?.completion_tokens || 0,
          total: usage?.total_tokens || 0,
        },
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
      'gpt-4-turbo-preview': 0.01, // $0.01 per 1k prompt tokens
      'gpt-4': 0.03,
      'gpt-3.5-turbo': 0.0005,
      'gpt-3.5-turbo-16k': 0.001,
    };

    return pricing[model] || pricing['gpt-4-turbo-preview'];
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
