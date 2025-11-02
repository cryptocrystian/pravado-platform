// =====================================================
// MEDIA MONITORING AGENT
// =====================================================
// AI-powered NLP analysis for media mentions

import OpenAI from 'openai';
import crypto from 'crypto';
import { logger } from '../lib/logger';
import type {
  MediaMention,
  CreateMentionInput,
  NLPAnalysisResult,
  MentionSentiment,
  MentionTone,
  MentionStance,
  MentionEmotion,
  DetectedEntities,
} from '@pravado/shared-types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// =====================================================
// NLP ANALYSIS
// =====================================================

export class MediaMonitoringAgent {
  /**
   * Analyze a media mention with AI
   */
  async analyzeMention(mention: CreateMentionInput, fullContent?: string): Promise<NLPAnalysisResult> {
    const startTime = Date.now();
    const contentForAnalysis = fullContent || mention.excerpt || mention.title;

    logger.info('[MediaMonitoringAgent] Starting NLP analysis', {
      title: mention.title,
      contentLength: contentForAnalysis.length,
    });

    try {
      // Perform NLP analysis using GPT-4
      const analysis = await this.performNLPAnalysis(contentForAnalysis, mention);

      // Generate embeddings
      const embedding = await this.generateEmbedding(contentForAnalysis);

      const result: NLPAnalysisResult = {
        ...analysis,
        confidenceScore: this.calculateConfidence(analysis),
        tokensUsed: analysis.tokensUsed,
      };

      logger.info('[MediaMonitoringAgent] NLP analysis completed', {
        executionTimeMs: Date.now() - startTime,
        sentiment: result.sentiment,
        relevanceScore: result.relevanceScore,
      });

      return result;
    } catch (error) {
      logger.error('[MediaMonitoringAgent] NLP analysis failed', error);
      throw error;
    }
  }

  /**
   * Perform comprehensive NLP analysis using GPT-4
   */
  private async performNLPAnalysis(
    content: string,
    mention: CreateMentionInput
  ): Promise<Omit<NLPAnalysisResult, 'confidenceScore'>> {
    const systemPrompt = `You are an expert NLP analyst specializing in brand and media monitoring. Analyze the following content and provide structured insights.

Your task:
1. Determine the overall sentiment (POSITIVE, NEUTRAL, NEGATIVE, MIXED)
2. Calculate a sentiment score from -1.0 (very negative) to 1.0 (very positive)
3. Identify the tone (PROFESSIONAL, CASUAL, FORMAL, TECHNICAL, PROMOTIONAL)
4. Determine the stance toward the subject (SUPPORTIVE, NEUTRAL, CRITICAL, BALANCED)
5. Detect the primary emotion (JOY, TRUST, FEAR, SURPRISE, SADNESS, ANGER, NEUTRAL)
6. Calculate relevance score (0-100) based on how directly it relates to the brand/topic
7. Calculate visibility score (0-100) based on source authority and potential reach
8. Calculate virality score (0-100) based on content characteristics and engagement potential
9. Extract all mentioned entities: brands, competitors, products, people, locations, organizations
10. Generate entity tags for categorization

Return your analysis as JSON.`;

    const userPrompt = `Content to analyze:
Title: ${mention.title}
Source: ${mention.outlet || 'Unknown'}
Medium: ${mention.medium}
Type: ${mention.mentionType}

Full Content:
${content}

Provide comprehensive NLP analysis in JSON format.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 1500,
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(response);

    return {
      sentiment: this.normalizeSentiment(analysis.sentiment),
      sentimentScore: this.normalizeSentimentScore(analysis.sentimentScore),
      tone: this.normalizeTone(analysis.tone),
      stance: this.normalizeStance(analysis.stance),
      emotion: this.normalizeEmotion(analysis.emotion),
      relevanceScore: Math.min(100, Math.max(0, analysis.relevanceScore || 50)),
      visibilityScore: Math.min(100, Math.max(0, analysis.visibilityScore || 50)),
      viralityScore: Math.min(100, Math.max(0, analysis.viralityScore || 0)),
      detectedEntities: this.normalizeEntities(analysis.detectedEntities || {}),
      entityTags: analysis.entityTags || [],
      tokensUsed: completion.usage?.total_tokens || 0,
    };
  }

  /**
   * Generate vector embedding for semantic search
   */
  private async generateEmbedding(content: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: content.slice(0, 8000), // Limit content length
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('[MediaMonitoringAgent] Embedding generation failed', error);
      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Calculate content hash for deduplication
   */
  calculateContentHash(title: string, excerpt: string): string {
    const combined = `${title}||${excerpt}`.toLowerCase().trim();
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Calculate confidence score based on analysis results
   */
  private calculateConfidence(analysis: any): number {
    let confidence = 0.7; // Base confidence

    // Higher confidence if sentiment score is strong
    if (Math.abs(analysis.sentimentScore) > 0.7) {
      confidence += 0.1;
    }

    // Higher confidence if multiple entities detected
    const entityCount = Object.values(analysis.detectedEntities || {}).reduce(
      (sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0),
      0
    );
    if (entityCount > 3) {
      confidence += 0.1;
    }

    // Lower confidence if relevance score is low
    if (analysis.relevanceScore < 30) {
      confidence -= 0.2;
    }

    return Math.min(1.0, Math.max(0.0, confidence));
  }

  // =====================================================
  // NORMALIZATION HELPERS
  // =====================================================

  private normalizeSentiment(value: string): MentionSentiment {
    const normalized = value?.toUpperCase();
    if (['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED'].includes(normalized)) {
      return normalized as MentionSentiment;
    }
    return 'NEUTRAL' as MentionSentiment;
  }

  private normalizeSentimentScore(value: number): number {
    return Math.min(1.0, Math.max(-1.0, value || 0));
  }

  private normalizeTone(value: string): MentionTone {
    const normalized = value?.toUpperCase();
    if (['PROFESSIONAL', 'CASUAL', 'FORMAL', 'TECHNICAL', 'PROMOTIONAL'].includes(normalized)) {
      return normalized as MentionTone;
    }
    return 'PROFESSIONAL' as MentionTone;
  }

  private normalizeStance(value: string): MentionStance {
    const normalized = value?.toUpperCase();
    if (['SUPPORTIVE', 'NEUTRAL', 'CRITICAL', 'BALANCED'].includes(normalized)) {
      return normalized as MentionStance;
    }
    return 'NEUTRAL' as MentionStance;
  }

  private normalizeEmotion(value: string): MentionEmotion {
    const normalized = value?.toUpperCase();
    if (['JOY', 'TRUST', 'FEAR', 'SURPRISE', 'SADNESS', 'ANGER', 'NEUTRAL'].includes(normalized)) {
      return normalized as MentionEmotion;
    }
    return 'NEUTRAL' as MentionEmotion;
  }

  private normalizeEntities(entities: any): DetectedEntities {
    return {
      brands: Array.isArray(entities.brands) ? entities.brands : [],
      competitors: Array.isArray(entities.competitors) ? entities.competitors : [],
      products: Array.isArray(entities.products) ? entities.products : [],
      people: Array.isArray(entities.people) ? entities.people : [],
      locations: Array.isArray(entities.locations) ? entities.locations : [],
      organizations: Array.isArray(entities.organizations) ? entities.organizations : [],
    };
  }
}

export const mediaMonitoringAgent = new MediaMonitoringAgent();
