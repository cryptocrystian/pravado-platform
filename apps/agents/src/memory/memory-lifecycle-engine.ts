// =====================================================
// MEMORY LIFECYCLE ENGINE
// Sprint 37: Autonomous memory pruning, aging, and lifespan management
// =====================================================

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type {
  AgeMemoryInput,
  AgeMemoryResult,
  CompressMemoryInput,
  CompressMemoryResult,
  PruneMemoryInput,
  PruneMemoryResult,
  ArchiveMemoryInput,
  ArchiveMemoryResult,
  MarkForArchivalInput,
  RecommendArchivalInput,
  AssessImportanceInput,
  GetRetentionPlanInput,
  ReinforceMemoryInput,
  GetLifecycleDashboardInput,
  MemoryRetentionPlan,
  MemoryLifecycleDashboard,
  MemoryArchivalRecommendation,
  MemoryImportanceAssessment,
  MemoryCompressionResult,
  MemoryAgingMetrics,
  MemoryLifecycleEvent,
} from '@pravado/types';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class MemoryLifecycleEngine {
  // =====================================================
  // AGING OPERATIONS
  // =====================================================

  /**
   * Age memory episodes by reducing their age score based on decay factor
   */
  async ageMemoryEpisodes(input: AgeMemoryInput): Promise<AgeMemoryResult> {
    const { organizationId, daysSinceLastRun = 1 } = input;

    // Call database function to age all episodes
    const { data, error } = await supabase.rpc('age_memory_episodes', {
      p_organization_id: organizationId,
      p_days_since_last_run: daysSinceLastRun,
    });

    if (error) throw new Error(`Failed to age memory episodes: ${error.message}`);

    const episodes = data || [];

    // Calculate summary statistics
    const totalDecay = episodes.reduce((sum: number, ep: any) => sum + (ep.decay_amount || 0), 0);
    const avgNewScore = episodes.length > 0
      ? episodes.reduce((sum: number, ep: any) => sum + (ep.new_age_score || 0), 0) / episodes.length
      : 0;

    // Log lifecycle events
    for (const episode of episodes) {
      await this.logLifecycleEvent({
        organizationId,
        episodeId: episode.episode_id,
        eventType: 'AGED',
        previousAgeScore: episode.previous_age_score,
        newAgeScore: episode.new_age_score,
        reasoning: `Aged by ${episode.decay_amount.toFixed(2)} points after ${daysSinceLastRun} day(s)`,
      });
    }

    return {
      episodes_aged: episodes.length,
      total_decay_amount: totalDecay,
      avg_new_age_score: avgNewScore,
      episodes: episodes.map((ep: any) => ({
        episode_id: ep.episode_id,
        title: ep.title,
        previous_age_score: ep.previous_age_score,
        new_age_score: ep.new_age_score,
        decay_amount: ep.decay_amount,
      })),
    };
  }

  /**
   * Reinforce a memory episode (increase age score on access)
   */
  async reinforceMemory(input: ReinforceMemoryInput): Promise<void> {
    const { episodeId, reinforcementAmount = 10.0 } = input;

    const { error } = await supabase.rpc('reinforce_memory_episode', {
      p_episode_id: episodeId,
      p_reinforcement_amount: reinforcementAmount,
    });

    if (error) throw new Error(`Failed to reinforce memory: ${error.message}`);

    // Get episode details for logging
    const { data: episode } = await supabase
      .from('agent_memory_episodes')
      .select('organization_id')
      .eq('id', episodeId)
      .single();

    if (episode) {
      await this.logLifecycleEvent({
        organizationId: episode.organization_id,
        episodeId,
        eventType: 'REINFORCED',
        reasoning: `Memory reinforced by ${reinforcementAmount} points due to access`,
      });
    }
  }

  /**
   * Get aging metrics for a specific episode
   */
  async getAgingMetrics(episodeId: string): Promise<MemoryAgingMetrics> {
    const { data: episode, error } = await supabase
      .from('agent_memory_episodes')
      .select('*')
      .eq('id', episodeId)
      .single();

    if (error || !episode) {
      throw new Error(`Failed to get episode: ${error?.message || 'Not found'}`);
    }

    // Get lifecycle events history for trends
    const { data: events } = await supabase
      .from('agent_memory_lifecycle_events')
      .select('*')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: true })
      .limit(100);

    // Build age score trend
    const ageTrend = (events || [])
      .filter((e) => e.event_type === 'AGED' && e.new_age_score !== null)
      .map((e) => ({
        date: e.created_at,
        score: e.new_age_score,
      }));

    // Calculate projections
    const daysUntilZero = episode.age_score > 0
      ? Math.ceil(episode.age_score / episode.decay_factor)
      : 0;

    const projected30d = Math.max(0, episode.age_score - (episode.decay_factor * 30));
    const projected90d = Math.max(0, episode.age_score - (episode.decay_factor * 90));

    // Calculate access frequency
    const daysSinceCreated = Math.max(
      1,
      Math.floor((Date.now() - new Date(episode.created_at).getTime()) / (1000 * 60 * 60 * 24))
    );
    const accessFrequency = episode.access_count / daysSinceCreated;
    const reinforcementFrequency = episode.reinforcement_count / daysSinceCreated;

    const lastAccessedDaysAgo = episode.last_accessed_at
      ? Math.floor((Date.now() - new Date(episode.last_accessed_at).getTime()) / (1000 * 60 * 60 * 24))
      : daysSinceCreated;

    // Determine recommended action
    let recommendedAction: 'COMPRESS' | 'ARCHIVE' | 'PRUNE' | 'RETAIN' | 'REINFORCE' = 'RETAIN';
    let actionReasoning = '';

    if (episode.age_score < 10 && episode.importance_score < 20) {
      recommendedAction = 'PRUNE';
      actionReasoning = 'Very low age and importance scores indicate this memory is no longer valuable';
    } else if (episode.age_score < 30 && episode.content.length > 1000 && !episode.compressed) {
      recommendedAction = 'COMPRESS';
      actionReasoning = 'Low age score with large content suggests compression would be beneficial';
    } else if (episode.age_score < 20 && lastAccessedDaysAgo > 60) {
      recommendedAction = 'ARCHIVE';
      actionReasoning = 'Low age score and long period of inactivity suggests archival';
    } else if (accessFrequency > 0.1) {
      recommendedAction = 'REINFORCE';
      actionReasoning = 'High access frequency indicates this is valuable memory worth reinforcing';
    }

    return {
      episode_id: episodeId,
      title: episode.title,
      current_age_score: episode.age_score,
      current_importance: episode.importance_score,
      current_retention_priority: episode.retention_priority,
      age_score_trend: ageTrend,
      importance_trend: [], // Could be populated from historical assessments
      decay_factor: episode.decay_factor,
      days_until_zero: daysUntilZero,
      projected_age_score_30d: projected30d,
      projected_age_score_90d: projected90d,
      access_frequency: accessFrequency,
      last_accessed_days_ago: lastAccessedDaysAgo,
      reinforcement_frequency: reinforcementFrequency,
      should_compress: recommendedAction === 'COMPRESS',
      should_archive: recommendedAction === 'ARCHIVE',
      should_prune: recommendedAction === 'PRUNE',
      recommended_action: recommendedAction,
      action_reasoning: actionReasoning,
    };
  }

  // =====================================================
  // COMPRESSION OPERATIONS
  // =====================================================

  /**
   * Compress old memory using GPT-4
   */
  async compressOldMemory(input: CompressMemoryInput): Promise<CompressMemoryResult> {
    const { episodeId, preserveKeyPoints = true, targetCompressionRatio = 0.3 } = input;

    // Get episode
    const { data: episode, error } = await supabase
      .from('agent_memory_episodes')
      .select('*')
      .eq('id', episodeId)
      .single();

    if (error || !episode) {
      throw new Error(`Failed to get episode: ${error?.message || 'Not found'}`);
    }

    if (episode.compressed) {
      throw new Error('Episode is already compressed');
    }

    // Generate compressed version using GPT-4
    const compressionResult = await this.generateCompressionSummary(
      episode.content,
      episode.title,
      preserveKeyPoints,
      targetCompressionRatio
    );

    // Update episode with compressed content
    const { error: updateError } = await supabase
      .from('agent_memory_episodes')
      .update({
        summary: compressionResult.compressed_content,
        compressed: true,
        compressed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', episodeId);

    if (updateError) {
      throw new Error(`Failed to update episode: ${updateError.message}`);
    }

    // Log lifecycle event
    await this.logLifecycleEvent({
      organizationId: episode.organization_id,
      episodeId,
      eventType: 'COMPRESSED',
      reasoning: `Compressed content from ${compressionResult.original_size} to ${compressionResult.compressed_size} characters (${(compressionResult.compression_ratio * 100).toFixed(1)}% of original)`,
      metadata: {
        key_points: compressionResult.key_points_preserved,
        information_loss: compressionResult.information_loss_assessment,
      },
    });

    return {
      episode_id: episodeId,
      compressed: true,
      original_size: compressionResult.original_size,
      compressed_size: compressionResult.compressed_size,
      compression_ratio: compressionResult.compression_ratio,
      bytes_saved: compressionResult.original_size - compressionResult.compressed_size,
    };
  }

  /**
   * Generate compressed summary using GPT-4
   */
  private async generateCompressionSummary(
    content: string,
    title: string,
    preserveKeyPoints: boolean,
    targetRatio: number
  ): Promise<MemoryCompressionResult> {
    const targetLength = Math.floor(content.length * targetRatio);

    const systemPrompt = `You are a memory compression expert. Your task is to compress memory episode content while preserving the most important information.

${preserveKeyPoints ? 'Extract and preserve key points, facts, and insights.' : 'Create a concise summary.'}

Target compression ratio: ${(targetRatio * 100).toFixed(0)}%
Target length: approximately ${targetLength} characters

Return a JSON object with:
{
  "compressed_content": "The compressed version",
  "key_points_preserved": ["point1", "point2", ...],
  "information_loss_assessment": "Brief assessment of what information was lost"
}`;

    const userPrompt = `Title: ${title}

Original Content:
${content}

Compress this memory episode.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    return {
      episode_id: '', // Will be set by caller
      original_content: content,
      compressed_content: result.compressed_content,
      original_size: content.length,
      compressed_size: result.compressed_content.length,
      compression_ratio: result.compressed_content.length / content.length,
      key_points_preserved: result.key_points_preserved || [],
      information_loss_assessment: result.information_loss_assessment || '',
      compressed_at: new Date().toISOString(),
    };
  }

  // =====================================================
  // PRUNING OPERATIONS
  // =====================================================

  /**
   * Prune expired memory
   */
  async pruneExpiredMemory(input: PruneMemoryInput): Promise<PruneMemoryResult> {
    const {
      organizationId,
      episodeIds,
      ageThreshold = 10,
      importanceThreshold = 20,
      daysInactive = 90,
      dryRun = false,
    } = input;

    let candidateIds: string[];

    if (episodeIds && episodeIds.length > 0) {
      // Prune specific episodes
      candidateIds = episodeIds;
    } else {
      // Get pruning candidates from database function
      const { data, error } = await supabase.rpc('get_pruning_candidates', {
        p_organization_id: organizationId,
        p_age_threshold: ageThreshold,
        p_importance_threshold: importanceThreshold,
        p_days_inactive: daysInactive,
        p_limit: 1000,
      });

      if (error) throw new Error(`Failed to get pruning candidates: ${error.message}`);

      candidateIds = (data || []).map((c: any) => c.episode_id);
    }

    if (candidateIds.length === 0) {
      return {
        episodes_pruned: 0,
        bytes_freed: 0,
        episodes: [],
      };
    }

    // Get episode details before pruning
    const { data: episodes } = await supabase
      .from('agent_memory_episodes')
      .select('id, title, content, organization_id, age_score, importance_score')
      .in('id', candidateIds);

    if (!episodes || episodes.length === 0) {
      return {
        episodes_pruned: 0,
        bytes_freed: 0,
        episodes: [],
      };
    }

    const bytesFreed = episodes.reduce((sum, ep) => sum + (ep.content?.length || 0), 0);

    if (dryRun) {
      return {
        episodes_pruned: 0,
        bytes_freed: bytesFreed,
        episodes: episodes.map((ep) => ({
          episode_id: ep.id,
          title: ep.title,
          reason: `Candidate for pruning: age=${ep.age_score}, importance=${ep.importance_score}`,
        })),
      };
    }

    // Prune episodes
    const { error: pruneError } = await supabase.rpc('prune_memory_episodes', {
      p_episode_ids: candidateIds,
    });

    if (pruneError) throw new Error(`Failed to prune episodes: ${pruneError.message}`);

    // Log lifecycle events
    for (const episode of episodes) {
      await this.logLifecycleEvent({
        organizationId: episode.organization_id,
        episodeId: episode.id,
        eventType: 'PRUNED',
        reasoning: `Pruned due to low value: age_score=${episode.age_score}, importance=${episode.importance_score}`,
      });
    }

    return {
      episodes_pruned: episodes.length,
      bytes_freed: bytesFreed,
      episodes: episodes.map((ep) => ({
        episode_id: ep.id,
        title: ep.title,
        reason: `Pruned: age_score=${ep.age_score}, importance=${ep.importance_score}`,
      })),
    };
  }

  /**
   * Archive memory episodes
   */
  async archiveMemoryEpisodes(input: ArchiveMemoryInput): Promise<ArchiveMemoryResult> {
    const { episodeIds, reason } = input;

    if (!episodeIds || episodeIds.length === 0) {
      return {
        episodes_archived: 0,
        episodes: [],
      };
    }

    // Archive episodes
    const { error } = await supabase.rpc('archive_memory_episodes', {
      p_episode_ids: episodeIds,
    });

    if (error) throw new Error(`Failed to archive episodes: ${error.message}`);

    // Get archived episode details
    const { data: episodes } = await supabase
      .from('agent_memory_episodes')
      .select('id, title, organization_id, archived_at')
      .in('id', episodeIds);

    // Log lifecycle events
    for (const episode of episodes || []) {
      await this.logLifecycleEvent({
        organizationId: episode.organization_id,
        episodeId: episode.id,
        eventType: 'ARCHIVED',
        reasoning: reason || 'Manually archived',
      });
    }

    return {
      episodes_archived: episodes?.length || 0,
      episodes: (episodes || []).map((ep) => ({
        episode_id: ep.id,
        title: ep.title,
        archived_at: ep.archived_at,
      })),
    };
  }

  /**
   * Mark episode for archival with expiration date
   */
  async markForArchival(input: MarkForArchivalInput): Promise<void> {
    const { episodeId, expiresAt, reason } = input;

    const { data: episode, error } = await supabase
      .from('agent_memory_episodes')
      .update({
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', episodeId)
      .select('organization_id')
      .single();

    if (error) throw new Error(`Failed to mark for archival: ${error.message}`);

    await this.logLifecycleEvent({
      organizationId: episode.organization_id,
      episodeId,
      eventType: 'ASSESSED',
      reasoning: reason || 'Marked for archival',
      recommendation: `Expires at ${expiresAt}`,
    });
  }

  // =====================================================
  // RETENTION PLANNING
  // =====================================================

  /**
   * Get memory retention plan
   */
  async getMemoryRetentionPlan(input: GetRetentionPlanInput): Promise<MemoryRetentionPlan> {
    const { organizationId, agentId, threadId } = input;

    // Get compression candidates
    const { data: compressionCandidates } = await supabase.rpc('get_compression_candidates', {
      p_organization_id: organizationId,
      p_age_threshold: 30,
      p_min_size: 1000,
      p_limit: 50,
    });

    // Get pruning candidates
    const { data: pruningCandidates } = await supabase.rpc('get_pruning_candidates', {
      p_organization_id: organizationId,
      p_age_threshold: 10,
      p_importance_threshold: 20,
      p_days_inactive: 90,
      p_limit: 100,
    });

    // Get all episodes for statistics
    let query = supabase
      .from('agent_memory_episodes')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('pruned', false);

    if (agentId) query = query.eq('agent_id', agentId);
    if (threadId) query = query.eq('thread_id', threadId);

    const { data: allEpisodes, count: totalCount } = await query;

    // Use GPT-4 to generate archival recommendations
    const archivalRecommendations = await this.recommendArchivalCandidates({
      organizationId,
      limit: 50,
    });

    // Build retention plan
    const compressionList = (compressionCandidates || []).map((c: any) => ({
      episode_id: c.episode_id,
      title: c.title,
      age_score: c.age_score,
      importance_score: c.importance_score,
      content_length: c.content_length,
      days_since_access: c.days_since_access,
      reasoning: `Large content (${c.content_length} chars) with declining age score (${c.age_score})`,
    }));

    const archivalList = archivalRecommendations.slice(0, 30).map((rec) => ({
      episode_id: rec.episode_id,
      title: rec.title,
      age_score: rec.age_score,
      importance_score: rec.importance_score,
      retention_priority: rec.retention_priority,
      days_since_access: rec.days_since_last_access,
      reasoning: rec.reasoning,
    }));

    const pruningList = (pruningCandidates || []).slice(0, 20).map((c: any) => ({
      episode_id: c.episode_id,
      title: c.title,
      age_score: c.age_score,
      importance_score: c.importance_score,
      retention_priority: c.retention_priority,
      access_count: c.access_count,
      memory_type: c.memory_type,
      reasoning: `Very low value: age=${c.age_score}, importance=${c.importance_score}, unused for ${c.days_since_access} days`,
    }));

    // Generate recommended actions
    const recommendedActions: Array<{
      action: 'COMPRESS' | 'ARCHIVE' | 'PRUNE' | 'RETAIN';
      episode_ids: string[];
      priority: number;
      reason: string;
      estimated_savings_bytes?: number;
    }> = [];

    if (compressionList.length > 0) {
      const estimatedSavings = compressionList.reduce((sum, c) => sum + Math.floor(c.content_length * 0.7), 0);
      recommendedActions.push({
        action: 'COMPRESS',
        episode_ids: compressionList.map((c) => c.episode_id),
        priority: 80,
        reason: `Compress ${compressionList.length} large, aging episodes to save approximately ${(estimatedSavings / 1024).toFixed(0)}KB`,
        estimated_savings_bytes: estimatedSavings,
      });
    }

    if (archivalList.length > 0) {
      recommendedActions.push({
        action: 'ARCHIVE',
        episode_ids: archivalList.map((c) => c.episode_id),
        priority: 60,
        reason: `Archive ${archivalList.length} low-value episodes to optimize active memory`,
      });
    }

    if (pruningList.length > 0) {
      const estimatedSavings = allEpisodes
        ?.filter((e) => pruningList.some((p) => p.episode_id === e.id))
        .reduce((sum, e) => sum + (e.content?.length || 0), 0) || 0;

      recommendedActions.push({
        action: 'PRUNE',
        episode_ids: pruningList.map((c) => c.episode_id),
        priority: 40,
        reason: `Prune ${pruningList.length} expired/stale episodes to free approximately ${(estimatedSavings / 1024).toFixed(0)}KB`,
        estimated_savings_bytes: estimatedSavings,
      });
    }

    return {
      organization_id: organizationId,
      generated_at: new Date().toISOString(),
      total_episodes: totalCount || 0,
      episodes_to_compress: compressionList.length,
      episodes_to_archive: archivalList.length,
      episodes_to_prune: pruningList.length,
      episodes_to_retain: (totalCount || 0) - compressionList.length - archivalList.length - pruningList.length,
      compression_candidates: compressionList,
      archival_candidates: archivalList,
      pruning_candidates: pruningList,
      recommended_actions: recommendedActions.sort((a, b) => b.priority - a.priority),
    };
  }

  // =====================================================
  // AI-POWERED FUNCTIONS
  // =====================================================

  /**
   * Recommend archival candidates using GPT-4
   */
  async recommendArchivalCandidates(input: RecommendArchivalInput): Promise<MemoryArchivalRecommendation[]> {
    const { organizationId, limit = 50, ageThreshold = 30, importanceThreshold = 40 } = input;

    // Get candidate episodes
    const { data: episodes } = await supabase
      .from('agent_memory_episodes')
      .select(`
        *,
        links:agent_memory_links(count)
      `)
      .eq('organization_id', organizationId)
      .eq('pruned', false)
      .is('archived_at', null)
      .lt('age_score', ageThreshold)
      .lt('importance_score', importanceThreshold)
      .order('retention_priority', { ascending: true })
      .limit(limit);

    if (!episodes || episodes.length === 0) {
      return [];
    }

    // Use GPT-4 to analyze each candidate
    const recommendations: MemoryArchivalRecommendation[] = [];

    for (const episode of episodes.slice(0, 20)) {
      // Limit GPT calls to avoid costs
      const assessment = await this.assessArchivalCandidate(episode);
      recommendations.push(assessment);
    }

    // For remaining episodes, use rule-based recommendations
    for (const episode of episodes.slice(20)) {
      const daysSinceAccess = episode.last_accessed_at
        ? Math.floor((Date.now() - new Date(episode.last_accessed_at).getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((Date.now() - new Date(episode.created_at).getTime()) / (1000 * 60 * 60 * 24));

      let action: 'ARCHIVE' | 'COMPRESS' | 'RETAIN' = 'ARCHIVE';
      let reasoning = '';

      if (episode.age_score < 15 && episode.importance_score < 25) {
        action = 'ARCHIVE';
        reasoning = 'Very low age and importance scores with minimal recent activity';
      } else if (episode.content.length > 2000 && !episode.compressed) {
        action = 'COMPRESS';
        reasoning = 'Large content size suggests compression before archival';
      } else {
        action = 'RETAIN';
        reasoning = 'Scores not low enough to warrant archival';
      }

      recommendations.push({
        episode_id: episode.id,
        title: episode.title,
        memory_type: episode.memory_type,
        age_score: episode.age_score,
        importance_score: episode.importance_score,
        retention_priority: episode.retention_priority,
        access_count: episode.access_count,
        days_since_last_access: daysSinceAccess,
        reinforcement_count: episode.reinforcement_count,
        recommended_action: action,
        confidence: 70,
        reasoning,
        risk_assessment: 'Low risk - minimal recent activity',
        storage_impact: episode.content?.length || 0,
        related_episodes: 0,
        estimated_value_loss: episode.importance_score,
      });
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Assess a single archival candidate using GPT-4
   */
  private async assessArchivalCandidate(episode: any): Promise<MemoryArchivalRecommendation> {
    const daysSinceAccess = episode.last_accessed_at
      ? Math.floor((Date.now() - new Date(episode.last_accessed_at).getTime()) / (1000 * 60 * 60 * 24))
      : Math.floor((Date.now() - new Date(episode.created_at).getTime()) / (1000 * 60 * 60 * 24));

    const systemPrompt = `You are a memory retention expert analyzing whether a memory episode should be archived, compressed, or retained.

Consider:
- Age score (0-100): Current value of the memory based on decay
- Importance score (0-100): Strategic importance
- Access patterns: How often it's accessed
- Content quality and uniqueness
- Risk of information loss

Return a JSON object with:
{
  "recommended_action": "ARCHIVE" | "COMPRESS" | "RETAIN",
  "confidence": 0-100,
  "reasoning": "Brief explanation",
  "risk_assessment": "Risk level and description",
  "estimated_value_loss": 0-100
}`;

    const userPrompt = `Memory Episode Analysis:

Title: ${episode.title}
Type: ${episode.memory_type}
Age Score: ${episode.age_score}
Importance: ${episode.importance_score}
Access Count: ${episode.access_count}
Days Since Last Access: ${daysSinceAccess}
Reinforcement Count: ${episode.reinforcement_count}
Content Length: ${episode.content?.length || 0} characters
Compressed: ${episode.compressed ? 'Yes' : 'No'}

Content Preview:
${episode.content?.substring(0, 500)}...

Should this memory be archived, compressed, or retained?`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');

      return {
        episode_id: episode.id,
        title: episode.title,
        memory_type: episode.memory_type,
        age_score: episode.age_score,
        importance_score: episode.importance_score,
        retention_priority: episode.retention_priority,
        access_count: episode.access_count,
        days_since_last_access: daysSinceAccess,
        reinforcement_count: episode.reinforcement_count,
        recommended_action: result.recommended_action || 'RETAIN',
        confidence: result.confidence || 50,
        reasoning: result.reasoning || '',
        risk_assessment: result.risk_assessment || '',
        storage_impact: episode.content?.length || 0,
        related_episodes: episode.links?.[0]?.count || 0,
        estimated_value_loss: result.estimated_value_loss || 0,
      };
    } catch (error) {
      // Fallback to rule-based assessment
      return {
        episode_id: episode.id,
        title: episode.title,
        memory_type: episode.memory_type,
        age_score: episode.age_score,
        importance_score: episode.importance_score,
        retention_priority: episode.retention_priority,
        access_count: episode.access_count,
        days_since_last_access: daysSinceAccess,
        reinforcement_count: episode.reinforcement_count,
        recommended_action: episode.age_score < 20 ? 'ARCHIVE' : 'RETAIN',
        confidence: 60,
        reasoning: 'GPT assessment failed, using rule-based fallback',
        risk_assessment: 'Medium risk - automated assessment',
        storage_impact: episode.content?.length || 0,
        related_episodes: 0,
        estimated_value_loss: episode.importance_score,
      };
    }
  }

  /**
   * Assess memory importance using GPT-4
   */
  async assessMemoryImportance(input: AssessImportanceInput): Promise<MemoryImportanceAssessment> {
    const { episodeId, context } = input;

    // Get episode
    const { data: episode, error } = await supabase
      .from('agent_memory_episodes')
      .select(`
        *,
        links:agent_memory_links(count)
      `)
      .eq('id', episodeId)
      .single();

    if (error || !episode) {
      throw new Error(`Failed to get episode: ${error?.message || 'Not found'}`);
    }

    const systemPrompt = `You are an AI memory importance assessor. Analyze the strategic value of a memory episode.

Consider:
- Strategic alignment with goals and priorities
- Uniqueness and irreplaceability of information
- Recency and temporal relevance
- Relationships to other important data
- Potential future value

Return a JSON object with:
{
  "suggested_importance": 0-100,
  "confidence": 0-100,
  "strategic_value": 0-100,
  "recency_value": 0-100,
  "uniqueness_value": 0-100,
  "relationship_value": 0-100,
  "importance_factors": ["factor1", "factor2", ...],
  "reasoning": "Detailed explanation",
  "adjustment_recommended": true/false
}`;

    const contextInfo = context
      ? `
Strategic Context:
- Recent Goals: ${context.recentGoals?.join(', ') || 'None'}
- Active Campaigns: ${context.activeCampaigns?.join(', ') || 'None'}
- Strategic Priorities: ${context.strategicPriorities?.join(', ') || 'None'}
`
      : '';

    const userPrompt = `Memory Episode Assessment:

Title: ${episode.title}
Type: ${episode.memory_type}
Current Importance: ${episode.importance_score}
Age: ${Math.floor((Date.now() - new Date(episode.created_at).getTime()) / (1000 * 60 * 60 * 24))} days old
Access Count: ${episode.access_count}
Linked Relationships: ${episode.links?.[0]?.count || 0}
${contextInfo}
Content:
${episode.content}

Assess the strategic importance of this memory.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    // Update importance if adjustment is recommended
    if (result.adjustment_recommended && Math.abs(result.suggested_importance - episode.importance_score) > 10) {
      await supabase
        .from('agent_memory_episodes')
        .update({
          importance_score: result.suggested_importance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', episodeId);

      await this.logLifecycleEvent({
        organizationId: episode.organization_id,
        episodeId,
        eventType: 'ASSESSED',
        previousImportance: episode.importance_score,
        newImportance: result.suggested_importance,
        reasoning: result.reasoning,
      });

      // Recalculate retention priority
      await supabase.rpc('calculate_retention_priority', { p_episode_id: episodeId });
    }

    return {
      episode_id: episodeId,
      title: episode.title,
      content_preview: episode.content.substring(0, 200),
      current_importance: episode.importance_score,
      suggested_importance: result.suggested_importance || episode.importance_score,
      confidence: result.confidence || 50,
      strategic_value: result.strategic_value || 50,
      recency_value: result.recency_value || 50,
      uniqueness_value: result.uniqueness_value || 50,
      relationship_value: result.relationship_value || 50,
      importance_factors: result.importance_factors || [],
      reasoning: result.reasoning || '',
      adjustment_recommended: result.adjustment_recommended || false,
      related_goals: 0,
      related_campaigns: 0,
      related_contacts: 0,
      linked_episodes: episode.links?.[0]?.count || 0,
    };
  }

  // =====================================================
  // DASHBOARD & METRICS
  // =====================================================

  /**
   * Get lifecycle dashboard
   */
  async getLifecycleDashboard(input: GetLifecycleDashboardInput): Promise<MemoryLifecycleDashboard> {
    const { organizationId } = input;

    // Get dashboard data from database function
    const { data, error } = await supabase.rpc('get_memory_lifecycle_dashboard', {
      p_organization_id: organizationId,
    });

    if (error) throw new Error(`Failed to get dashboard: ${error.message}`);

    const dashboard = data[0];

    // Get today's activity
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayEvents } = await supabase
      .from('agent_memory_lifecycle_events')
      .select('event_type')
      .eq('organization_id', organizationId)
      .gte('created_at', todayStart.toISOString());

    const episodesAgedToday = todayEvents?.filter((e) => e.event_type === 'AGED').length || 0;
    const episodesCompressedToday = todayEvents?.filter((e) => e.event_type === 'COMPRESSED').length || 0;
    const episodesPrunedToday = todayEvents?.filter((e) => e.event_type === 'PRUNED').length || 0;
    const episodesReinforcedToday = todayEvents?.filter((e) => e.event_type === 'REINFORCED').length || 0;

    // Calculate health scores
    const healthScore = this.calculateHealthScore({
      avgAgeScore: dashboard.avg_age_score,
      avgRetentionPriority: dashboard.avg_retention_priority,
      compressionSavingsPct: dashboard.compression_savings_pct,
      activeEpisodes: dashboard.active_episodes,
      prunedEpisodes: dashboard.pruned_episodes,
    });

    const storageEfficiency = dashboard.compression_savings_pct;
    const retentionHealth = (dashboard.avg_retention_priority / 100) * 100;

    return {
      total_episodes: dashboard.total_episodes,
      active_episodes: dashboard.active_episodes,
      compressed_episodes: dashboard.compressed_episodes,
      pruned_episodes: dashboard.pruned_episodes,
      archived_episodes: dashboard.archived_episodes,
      avg_age_score: dashboard.avg_age_score,
      avg_retention_priority: dashboard.avg_retention_priority,
      age_distribution: {}, // Could be populated from additional query
      compression_candidates: dashboard.compression_candidates,
      pruning_candidates: dashboard.pruning_candidates,
      total_memory_size: dashboard.total_memory_size,
      compressed_memory_size: dashboard.compressed_memory_size,
      compression_savings_pct: dashboard.compression_savings_pct,
      episodes_aged_today: episodesAgedToday,
      episodes_compressed_today: episodesCompressedToday,
      episodes_pruned_today: episodesPrunedToday,
      episodes_reinforced_today: episodesReinforcedToday,
      health_score: healthScore,
      storage_efficiency: storageEfficiency,
      retention_health: retentionHealth,
    };
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(metrics: {
    avgAgeScore: number;
    avgRetentionPriority: number;
    compressionSavingsPct: number;
    activeEpisodes: number;
    prunedEpisodes: number;
  }): number {
    const {
      avgAgeScore,
      avgRetentionPriority,
      compressionSavingsPct,
      activeEpisodes,
      prunedEpisodes,
    } = metrics;

    // Health is a weighted combination of factors
    const ageHealth = avgAgeScore; // 0-100
    const retentionHealth = avgRetentionPriority; // 0-100
    const storageHealth = Math.min(100, compressionSavingsPct * 2); // 0-100
    const pruningHealth = activeEpisodes > 0
      ? Math.max(0, 100 - (prunedEpisodes / activeEpisodes) * 100)
      : 100;

    return Math.round(
      ageHealth * 0.3 +
      retentionHealth * 0.3 +
      storageHealth * 0.2 +
      pruningHealth * 0.2
    );
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  /**
   * Log lifecycle event
   */
  private async logLifecycleEvent(params: {
    organizationId: string;
    episodeId: string;
    eventType: 'AGED' | 'COMPRESSED' | 'PRUNED' | 'ARCHIVED' | 'REINFORCED' | 'ASSESSED';
    previousAgeScore?: number;
    newAgeScore?: number;
    previousImportance?: number;
    newImportance?: number;
    reasoning?: string;
    recommendation?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const { error } = await supabase.from('agent_memory_lifecycle_events').insert({
      organization_id: params.organizationId,
      episode_id: params.episodeId,
      event_type: params.eventType,
      previous_age_score: params.previousAgeScore,
      new_age_score: params.newAgeScore,
      previous_importance: params.previousImportance,
      new_importance: params.newImportance,
      reasoning: params.reasoning,
      recommendation: params.recommendation,
      metadata: params.metadata || {},
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to log lifecycle event:', error);
    }
  }
}

export const memoryLifecycleEngine = new MemoryLifecycleEngine();
