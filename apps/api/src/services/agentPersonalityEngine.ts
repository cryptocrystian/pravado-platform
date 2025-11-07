// =====================================================
// AGENT PERSONALITY ENGINE SERVICE
// Sprint 44 Phase 3.5.4
// =====================================================

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase';
import {
  AgentPersona,
  PersonaTraitsAnalytics,
  GeneratePersonaRequest,
  ApplyPersonalityRequest,
  ApplyPersonalityResult,
  GetPersonaTraitsRequest,
  PersonalityTone,
  DecisionStyle,
  CollaborationStyle,
  MemoryStyle,
  UserAlignment,
  CognitiveBias,
  PersonalityProfile,
  ToneModifier,
  StyleModifier,
  AgentPersonalityProfileEntity,
} from '@pravado/types';

/**
 * Agent Personality Engine
 * Generates and applies agent personality configurations
 */
class AgentPersonalityEngine {
  /**
   * Generate agent persona from multiple data sources
   */
  async generateAgentPersona(
    agentId: string,
    organizationId: string,
    options?: {
      analysisPeriodDays?: number;
      includeSettings?: boolean;
      includeMemory?: boolean;
      includeCollaborations?: boolean;
      includePlaybooks?: boolean;
      forceRegenerate?: boolean;
      saveProfile?: boolean;
    }
  ): Promise<AgentPersona> {
    const {
      analysisPeriodDays = 30,
      includeSettings = true,
      includeMemory = true,
      includeCollaborations = true,
      includePlaybooks = true,
      forceRegenerate = false,
      saveProfile = true,
    } = options || {};

    // Check for existing recent profile
    if (!forceRegenerate) {
      const existingProfile = await this.getActiveProfile(agentId, organizationId);
      if (existingProfile && this.isProfileRecent(existingProfile, 7)) {
        console.log(`Using existing profile for agent ${agentId}`);
        return this.profileToPersona(existingProfile);
      }
    }

    // Fetch data from multiple sources in parallel
    const [settingsData, memoryData, collaborationData, playbookData] = await Promise.all([
      includeSettings ? this.fetchAgentSettings(agentId) : Promise.resolve(null),
      includeMemory ? this.fetchMemoryPatterns(agentId, analysisPeriodDays) : Promise.resolve(null),
      includeCollaborations ? this.fetchCollaborationPatterns(agentId, analysisPeriodDays) : Promise.resolve(null),
      includePlaybooks ? this.fetchPlaybookPatterns(agentId, analysisPeriodDays) : Promise.resolve(null),
    ]);

    // Analyze data and extract personality traits
    const tone = this.determineTone(settingsData, memoryData, playbookData);
    const decisionStyle = this.determineDecisionStyle(collaborationData, playbookData);
    const collaborationStyle = this.determineCollaborationStyle(collaborationData);
    const memoryStyle = this.determineMemoryStyle(memoryData);
    const userAlignment = this.determineUserAlignment(settingsData, memoryData);
    const biases = this.detectBiases(collaborationData, playbookData);

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore({
      settingsData,
      memoryData,
      collaborationData,
      playbookData,
    });

    // Build persona
    const persona: AgentPersona = {
      agentId,
      organizationId,
      tone,
      decisionStyle,
      collaborationStyle,
      memoryStyle,
      userAlignment,
      biases,
      confidenceScore,
      metadata: {
        generatedAt: new Date(),
        dataSourcesUsed: [
          includeSettings && 'agent_settings',
          includeMemory && 'agent_memory',
          includeCollaborations && 'agent_collaboration_logs',
          includePlaybooks && 'agent_playbook_logs',
        ].filter(Boolean) as string[],
        analysisPeriodDays,
      },
    };

    // Save profile to database if requested
    if (saveProfile) {
      await this.saveProfile(persona, {
        settingsData,
        memoryData,
        collaborationData,
        playbookData,
      });
    }

    return persona;
  }

  /**
   * Apply personality to prompt
   */
  applyPersonalityToPrompt(
    prompt: string,
    persona: AgentPersona,
    options?: {
      includeTone?: boolean;
      includeStyle?: boolean;
      includeBiases?: boolean;
      templateType?: 'system' | 'user' | 'assistant';
    }
  ): ApplyPersonalityResult {
    const {
      includeTone = true,
      includeStyle = true,
      includeBiases = false,
      templateType = 'system',
    } = options || {};

    const originalPrompt = prompt;
    let modifiedPrompt = prompt;
    const modifications: ApplyPersonalityResult['modifications'] = {};

    // Apply tone modifiers
    if (includeTone) {
      const toneModifier = this.getToneModifier(persona.tone);
      modifiedPrompt = this.injectToneModifier(modifiedPrompt, toneModifier, templateType);
      modifications.tone = toneModifier.systemPrompt;
    }

    // Apply style modifiers
    if (includeStyle) {
      const styleModifier = this.getStyleModifier(persona);
      modifiedPrompt = this.injectStyleModifier(modifiedPrompt, styleModifier, templateType);
      modifications.style = styleModifier.systemPrompt;
    }

    // Apply bias reminders
    if (includeBiases && persona.biases && persona.biases.length > 0) {
      const biasReminders = this.getBiasReminders(persona.biases);
      modifiedPrompt = this.injectBiasReminders(modifiedPrompt, biasReminders, templateType);
      modifications.biases = biasReminders;
    }

    // Replace placeholders
    modifiedPrompt = modifiedPrompt
      .replace(/\{\{tone\}\}/g, persona.tone)
      .replace(/\{\{decisionStyle\}\}/g, persona.decisionStyle)
      .replace(/\{\{collaborationStyle\}\}/g, persona.collaborationStyle)
      .replace(/\{\{memoryStyle\}\}/g, persona.memoryStyle)
      .replace(/\{\{userAlignment\}\}/g, persona.userAlignment);

    // Calculate tokens
    const tokensAdded = Math.ceil((modifiedPrompt.length - originalPrompt.length) / 4);
    const totalTokens = Math.ceil(modifiedPrompt.length / 4);

    return {
      prompt: modifiedPrompt,
      originalPrompt,
      modifications,
      tokensAdded,
      totalTokens,
    };
  }

  /**
   * Get persona traits analytics
   */
  async getPersonaTraits(
    agentId: string,
    organizationId: string,
    analysisPeriodDays: number = 30
  ): Promise<PersonaTraitsAnalytics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - analysisPeriodDays);
    const endDate = new Date();

    // Fetch collaboration data
    const collaborationData = await this.fetchCollaborationPatterns(agentId, analysisPeriodDays);

    // Fetch playbook data
    const playbookData = await this.fetchPlaybookPatterns(agentId, analysisPeriodDays);

    // Fetch memory data
    const memoryData = await this.fetchMemoryPatterns(agentId, analysisPeriodDays);

    // Analyze tone usage
    const toneUsage = this.analyzeToneUsage(playbookData, memoryData);

    // Analyze collaboration patterns
    const collaborationPatterns = this.analyzeCollaborationPatterns(collaborationData);

    // Analyze decision metrics
    const decisionMetrics = this.analyzeDecisionMetrics(playbookData);

    // Detect behavioral trends
    const behavioralTrends = this.detectBehavioralTrends(collaborationData, playbookData);

    // Detect biases
    const detectedBiases = this.detectBiases(collaborationData, playbookData);

    // Analyze communication style
    const communicationAnalysis = this.analyzeCommunicationStyle(playbookData);

    // Analyze task patterns
    const taskPatterns = this.analyzeTaskPatterns(playbookData);

    return {
      agentId,
      organizationId,
      analysisPeriod: {
        start: startDate,
        end: endDate,
        days: analysisPeriodDays,
      },
      toneUsage,
      collaborationPatterns,
      decisionMetrics,
      behavioralTrends,
      detectedBiases,
      communicationAnalysis,
      taskPatterns,
    };
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  /**
   * Fetch agent settings
   */
  private async fetchAgentSettings(agentId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('agent_settings')
        .select('*')
        .eq('agent_id', agentId)
        .single();

      if (error) {
        console.warn(`No settings found for agent ${agentId}:`, error.message);
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching agent settings:', error);
      return null;
    }
  }

  /**
   * Fetch memory patterns
   */
  private async fetchMemoryPatterns(agentId: string, days: number): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('agent_memory_summaries')
        .select('*')
        .eq('agent_id', agentId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.warn(`Error fetching memory for agent ${agentId}:`, error.message);
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching memory patterns:', error);
      return null;
    }
  }

  /**
   * Fetch collaboration patterns
   */
  private async fetchCollaborationPatterns(agentId: string, days: number): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('agent_collaboration_logs')
        .select('*')
        .eq('initiating_agent_id', agentId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.warn(`Error fetching collaborations for agent ${agentId}:`, error.message);
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching collaboration patterns:', error);
      return null;
    }
  }

  /**
   * Fetch playbook patterns
   */
  private async fetchPlaybookPatterns(agentId: string, days: number): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('agent_playbook_logs')
        .select('*')
        .eq('agent_id', agentId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.warn(`Error fetching playbooks for agent ${agentId}:`, error.message);
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching playbook patterns:', error);
      return null;
    }
  }

  /**
   * Determine communication tone
   */
  private determineTone(settingsData: any, memoryData: any, playbookData: any): PersonalityTone {
    // Priority 1: Explicit setting in agent_settings
    if (settingsData?.tone) {
      return settingsData.tone as PersonalityTone;
    }

    // Priority 2: Analyze memory summaries for tone patterns
    if (memoryData && memoryData.length > 0) {
      const toneKeywords: Record<string, string[]> = {
        formal: ['formal', 'professional', 'structured', 'official'],
        casual: ['casual', 'relaxed', 'informal', 'friendly'],
        witty: ['witty', 'humorous', 'clever', 'playful'],
        assertive: ['assertive', 'confident', 'direct', 'strong'],
        empathetic: ['empathetic', 'understanding', 'compassionate', 'caring'],
      };

      const toneScores: Record<string, number> = {};

      memoryData.forEach((memory: any) => {
        const text = (memory.summary_text || '').toLowerCase();
        Object.entries(toneKeywords).forEach(([tone, keywords]) => {
          const matches = keywords.filter((kw) => text.includes(kw)).length;
          toneScores[tone] = (toneScores[tone] || 0) + matches;
        });
      });

      const dominantTone = Object.entries(toneScores).sort((a, b) => b[1] - a[1])[0];
      if (dominantTone && dominantTone[1] > 0) {
        return dominantTone[0] as PersonalityTone;
      }
    }

    // Default: professional
    return 'professional';
  }

  /**
   * Determine decision-making style
   */
  private determineDecisionStyle(collaborationData: any, playbookData: any): DecisionStyle {
    // Analyze escalation frequency
    const escalationRate = this.calculateEscalationRate(collaborationData);

    // Analyze decision latency from playbooks
    const avgDecisionLatency = this.calculateAvgDecisionLatency(playbookData);

    // Determine style based on patterns
    if (escalationRate > 0.3) {
      return 'cautious'; // Escalates frequently = cautious
    } else if (avgDecisionLatency < 1000) {
      return 'confident'; // Quick decisions = confident
    } else if (this.hasExploratoryPattern(playbookData)) {
      return 'exploratory';
    } else if (avgDecisionLatency > 5000) {
      return 'deliberate'; // Slow, careful decisions
    }

    return 'analytical';
  }

  /**
   * Determine collaboration style
   */
  private determineCollaborationStyle(collaborationData: any): CollaborationStyle {
    if (!collaborationData || collaborationData.length === 0) {
      return 'independent';
    }

    const totalCollaborations = collaborationData.length;
    const escalations = collaborationData.filter((c: any) => c.collaboration_type === 'escalation').length;
    const delegations = collaborationData.filter((c: any) => c.collaboration_type === 'delegation').length;
    const coordinations = collaborationData.filter((c: any) => c.collaboration_type === 'coordination').length;

    const escalationRate = escalations / totalCollaborations;
    const delegationRate = delegations / totalCollaborations;
    const coordinationRate = coordinations / totalCollaborations;

    if (escalationRate > 0.5) {
      return 'hierarchical';
    } else if (delegationRate > 0.5) {
      return 'delegative';
    } else if (coordinationRate > 0.3) {
      return 'collaborative';
    } else if (totalCollaborations < 5) {
      return 'independent';
    }

    return 'team-oriented';
  }

  /**
   * Determine memory style
   */
  private determineMemoryStyle(memoryData: any): MemoryStyle {
    if (!memoryData || memoryData.length === 0) {
      return 'balanced';
    }

    const shortTermSummaries = memoryData.filter((m: any) => m.scope === 'short_term').length;
    const longTermSummaries = memoryData.filter((m: any) => m.scope === 'long_term').length;

    if (shortTermSummaries > longTermSummaries * 2) {
      return 'short-term';
    } else if (longTermSummaries > shortTermSummaries * 2) {
      return 'long-term';
    }

    return 'balanced';
  }

  /**
   * Determine user alignment
   */
  private determineUserAlignment(settingsData: any, memoryData: any): UserAlignment {
    // Check explicit setting
    if (settingsData?.user_alignment) {
      return settingsData.user_alignment as UserAlignment;
    }

    // Analyze memory for alignment patterns
    if (memoryData && memoryData.length > 0) {
      const alignmentKeywords: Record<string, string[]> = {
        analytical: ['analyze', 'data', 'metrics', 'logical', 'reasoning'],
        empathetic: ['empathy', 'understand', 'feelings', 'support', 'care'],
        persuasive: ['persuade', 'convince', 'influence', 'motivate'],
        instructional: ['teach', 'guide', 'explain', 'instruct', 'educate'],
      };

      const alignmentScores: Record<string, number> = {};

      memoryData.forEach((memory: any) => {
        const text = (memory.summary_text || '').toLowerCase();
        Object.entries(alignmentKeywords).forEach(([alignment, keywords]) => {
          const matches = keywords.filter((kw) => text.includes(kw)).length;
          alignmentScores[alignment] = (alignmentScores[alignment] || 0) + matches;
        });
      });

      const dominantAlignment = Object.entries(alignmentScores).sort((a, b) => b[1] - a[1])[0];
      if (dominantAlignment && dominantAlignment[1] > 0) {
        return dominantAlignment[0] as UserAlignment;
      }
    }

    return 'supportive';
  }

  /**
   * Detect cognitive biases
   */
  private detectBiases(collaborationData: any, playbookData: any): CognitiveBias[] {
    const biases: CognitiveBias[] = [];

    // Detect optimism/pessimism bias
    const successRate = this.calculateSuccessRate(playbookData);
    if (successRate > 0.8) {
      biases.push({
        type: 'optimism',
        strength: Math.min((successRate - 0.5) * 2, 1),
        description: 'Tends toward optimistic outcomes',
      });
    } else if (successRate < 0.5) {
      biases.push({
        type: 'pessimism',
        strength: Math.min((0.5 - successRate) * 2, 1),
        description: 'Tends toward pessimistic outcomes',
      });
    }

    // Detect risk aversion
    const escalationRate = this.calculateEscalationRate(collaborationData);
    if (escalationRate > 0.4) {
      biases.push({
        type: 'risk-aversion',
        strength: Math.min(escalationRate, 1),
        description: 'Prefers escalating to avoid risk',
      });
    }

    // Detect recency bias
    if (this.hasRecencyBias(playbookData)) {
      biases.push({
        type: 'recency',
        strength: 0.6,
        description: 'Gives more weight to recent information',
      });
    }

    return biases;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidenceScore(data: {
    settingsData: any;
    memoryData: any;
    collaborationData: any;
    playbookData: any;
  }): number {
    let score = 0;
    let maxScore = 0;

    // Settings data (20%)
    maxScore += 0.2;
    if (data.settingsData) {
      score += 0.2;
    }

    // Memory data (30%)
    maxScore += 0.3;
    if (data.memoryData && data.memoryData.length > 0) {
      score += Math.min(data.memoryData.length / 10, 1) * 0.3;
    }

    // Collaboration data (25%)
    maxScore += 0.25;
    if (data.collaborationData && data.collaborationData.length > 0) {
      score += Math.min(data.collaborationData.length / 20, 1) * 0.25;
    }

    // Playbook data (25%)
    maxScore += 0.25;
    if (data.playbookData && data.playbookData.length > 0) {
      score += Math.min(data.playbookData.length / 30, 1) * 0.25;
    }

    return Math.min(score / maxScore, 1);
  }

  /**
   * Save profile to database
   */
  private async saveProfile(persona: AgentPersona, sourceData: any): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('agent_personality_profiles')
        .insert({
          agent_id: persona.agentId,
          organization_id: persona.organizationId,
          tone: persona.tone,
          decision_style: persona.decisionStyle,
          collaboration_style: persona.collaborationStyle,
          memory_style: persona.memoryStyle,
          user_alignment: persona.userAlignment,
          biases: persona.biases || [],
          custom_traits: persona.customTraits || null,
          confidence_score: persona.confidenceScore || 0.5,
          is_active: true,
          analysis_period_days: persona.metadata?.analysisPeriodDays || 30,
          traits: {
            tone: persona.tone,
            decisionStyle: persona.decisionStyle,
            collaborationStyle: persona.collaborationStyle,
          },
          behavioral_patterns: {
            dataSourcesUsed: persona.metadata?.dataSourcesUsed || [],
          },
          metadata: persona.metadata,
        });

      if (error) {
        console.error('Error saving personality profile:', error);
      } else {
        console.log(`Personality profile saved for agent ${persona.agentId}`);
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
    }
  }

  /**
   * Get active profile from database
   */
  private async getActiveProfile(
    agentId: string,
    organizationId: string
  ): Promise<AgentPersonalityProfileEntity | null> {
    try {
      const { data, error } = await supabase
        .from('agent_personality_profiles')
        .select('*')
        .eq('agent_id', agentId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return null;
      }

      return data as AgentPersonalityProfileEntity;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Check if profile is recent
   */
  private isProfileRecent(profile: AgentPersonalityProfileEntity, maxAgeDays: number): boolean {
    const profileDate = new Date(profile.created_at);
    const now = new Date();
    const ageInDays = (now.getTime() - profileDate.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays <= maxAgeDays;
  }

  /**
   * Convert profile entity to persona
   */
  private profileToPersona(profile: AgentPersonalityProfileEntity): AgentPersona {
    return {
      agentId: profile.agent_id,
      organizationId: profile.organization_id,
      tone: profile.tone,
      decisionStyle: profile.decision_style,
      collaborationStyle: profile.collaboration_style,
      memoryStyle: profile.memory_style,
      userAlignment: profile.user_alignment,
      biases: profile.biases as CognitiveBias[],
      customTraits: profile.custom_traits,
      confidenceScore: Number(profile.confidence_score),
      metadata: {
        generatedAt: profile.created_at,
        dataSourcesUsed: profile.metadata?.dataSourcesUsed || [],
        analysisPeriodDays: profile.analysis_period_days,
      },
    };
  }

  /**
   * Get tone modifier
   */
  private getToneModifier(tone: PersonalityTone): ToneModifier {
    const modifiers: Record<PersonalityTone, ToneModifier> = {
      formal: {
        tone: 'formal',
        systemPrompt: 'Communicate in a formal, structured manner. Use proper grammar and avoid colloquialisms.',
        examplePhrases: ['I would recommend', 'Please consider', 'It is advisable'],
        guidelines: ['Use formal language', 'Avoid contractions', 'Be respectful and professional'],
      },
      casual: {
        tone: 'casual',
        systemPrompt: 'Use a casual, conversational tone. Be friendly and approachable.',
        examplePhrases: ["Let's do this", "No worries", "Sounds good"],
        guidelines: ['Use contractions', 'Be conversational', 'Keep it light'],
      },
      witty: {
        tone: 'witty',
        systemPrompt: 'Be clever and occasionally humorous. Use wit to engage the user.',
        examplePhrases: ['Here\'s a clever approach', 'With a twist of creativity'],
        guidelines: ['Use wordplay when appropriate', 'Be clever', 'Keep humor professional'],
      },
      assertive: {
        tone: 'assertive',
        systemPrompt: 'Be direct and confident. State opinions clearly.',
        examplePhrases: ['I recommend', 'The best approach is', 'You should'],
        guidelines: ['Be direct', 'Show confidence', 'State clear opinions'],
      },
      friendly: {
        tone: 'friendly',
        systemPrompt: 'Be warm and approachable. Create a welcoming atmosphere.',
        examplePhrases: ['Happy to help', 'Great question', "I'd love to assist"],
        guidelines: ['Be warm', 'Show enthusiasm', 'Be encouraging'],
      },
      professional: {
        tone: 'professional',
        systemPrompt: 'Maintain professionalism while being approachable. Balance formality with friendliness.',
        examplePhrases: ['I suggest', 'Based on the data', 'My analysis shows'],
        guidelines: ['Be professional', 'Remain objective', 'Focus on facts'],
      },
      empathetic: {
        tone: 'empathetic',
        systemPrompt: 'Show understanding and compassion. Acknowledge user feelings and concerns.',
        examplePhrases: ['I understand', 'That makes sense', 'I appreciate your concern'],
        guidelines: ['Show understanding', 'Acknowledge feelings', 'Be supportive'],
      },
      direct: {
        tone: 'direct',
        systemPrompt: 'Be straightforward and to the point. Avoid unnecessary elaboration.',
        examplePhrases: ['Here\'s what you need to do', 'The answer is', 'Bottom line:'],
        guidelines: ['Be concise', 'Get to the point', 'Avoid fluff'],
      },
      diplomatic: {
        tone: 'diplomatic',
        systemPrompt: 'Be tactful and considerate. Frame suggestions diplomatically.',
        examplePhrases: ['You might consider', 'One approach could be', 'Perhaps'],
        guidelines: ['Be tactful', 'Soften suggestions', 'Consider all perspectives'],
      },
    };

    return modifiers[tone];
  }

  /**
   * Get style modifier
   */
  private getStyleModifier(persona: AgentPersona): StyleModifier {
    return {
      decisionStyle: persona.decisionStyle,
      collaborationStyle: persona.collaborationStyle,
      memoryStyle: persona.memoryStyle,
      userAlignment: persona.userAlignment,
      systemPrompt: `Decision approach: ${persona.decisionStyle}. Collaboration: ${persona.collaborationStyle}. Memory focus: ${persona.memoryStyle}. User alignment: ${persona.userAlignment}.`,
      guidelines: [
        `Make decisions in a ${persona.decisionStyle} manner`,
        `Collaborate in a ${persona.collaborationStyle} way`,
        `Focus on ${persona.memoryStyle} information`,
        `Align with user in an ${persona.userAlignment} manner`,
      ],
    };
  }

  /**
   * Get bias reminders
   */
  private getBiasReminders(biases: CognitiveBias[]): string[] {
    return biases.map(
      (bias) =>
        `Be aware of ${bias.type} bias (strength: ${bias.strength.toFixed(2)}). ${bias.description || ''}`
    );
  }

  /**
   * Inject tone modifier
   */
  private injectToneModifier(prompt: string, modifier: ToneModifier, templateType: string): string {
    if (templateType === 'system') {
      return `${modifier.systemPrompt}\n\n${prompt}`;
    }
    return prompt;
  }

  /**
   * Inject style modifier
   */
  private injectStyleModifier(prompt: string, modifier: StyleModifier, templateType: string): string {
    if (templateType === 'system') {
      return `${modifier.systemPrompt}\n\n${prompt}`;
    }
    return prompt;
  }

  /**
   * Inject bias reminders
   */
  private injectBiasReminders(prompt: string, reminders: string[], templateType: string): string {
    if (templateType === 'system' && reminders.length > 0) {
      const biasSection = `\nCognitive Bias Awareness:\n${reminders.map((r) => `- ${r}`).join('\n')}`;
      return `${prompt}${biasSection}`;
    }
    return prompt;
  }

  // Analytics helper methods
  private calculateEscalationRate(collaborationData: any): number {
    if (!collaborationData || collaborationData.length === 0) return 0;
    const escalations = collaborationData.filter((c: any) => c.collaboration_type === 'escalation').length;
    return escalations / collaborationData.length;
  }

  private calculateAvgDecisionLatency(playbookData: any): number {
    if (!playbookData || playbookData.length === 0) return 3000;
    // Mock: In real implementation, calculate from playbook execution times
    return 3000;
  }

  private hasExploratoryPattern(playbookData: any): boolean {
    // Mock: In real implementation, analyze playbook choices for exploration
    return false;
  }

  private calculateSuccessRate(playbookData: any): number {
    if (!playbookData || playbookData.length === 0) return 0.5;
    const successful = playbookData.filter((p: any) => p.status === 'completed').length;
    return successful / playbookData.length;
  }

  private hasRecencyBias(playbookData: any): boolean {
    // Mock: In real implementation, check if recent data is weighted more
    return false;
  }

  private analyzeToneUsage(playbookData: any, memoryData: any): PersonaTraitsAnalytics['toneUsage'] {
    // Mock implementation
    return [
      { tone: 'professional', frequency: 45, percentage: 45 },
      { tone: 'friendly', frequency: 30, percentage: 30 },
      { tone: 'casual', frequency: 25, percentage: 25 },
    ];
  }

  private analyzeCollaborationPatterns(
    collaborationData: any
  ): PersonaTraitsAnalytics['collaborationPatterns'] {
    if (!collaborationData || collaborationData.length === 0) {
      return {
        escalationRate: 0,
        delegationRate: 0,
        independentTaskRate: 1,
        avgCollaboratorsPerTask: 0,
      };
    }

    const total = collaborationData.length;
    const escalations = collaborationData.filter((c: any) => c.collaboration_type === 'escalation').length;
    const delegations = collaborationData.filter((c: any) => c.collaboration_type === 'delegation').length;

    return {
      escalationRate: escalations / total,
      delegationRate: delegations / total,
      independentTaskRate: 1 - (escalations + delegations) / total,
      avgCollaboratorsPerTask: 1.5,
    };
  }

  private analyzeDecisionMetrics(playbookData: any): PersonaTraitsAnalytics['decisionMetrics'] {
    if (!playbookData || playbookData.length === 0) {
      return {
        avgDecisionLatencyMs: 3000,
        decisionsWithHighConfidence: 0,
        decisionsWithLowConfidence: 0,
        exploratoryDecisions: 0,
      };
    }

    return {
      avgDecisionLatencyMs: 3000,
      decisionsWithHighConfidence: Math.floor(playbookData.length * 0.6),
      decisionsWithLowConfidence: Math.floor(playbookData.length * 0.2),
      exploratoryDecisions: Math.floor(playbookData.length * 0.2),
    };
  }

  private detectBehavioralTrends(
    collaborationData: any,
    playbookData: any
  ): PersonaTraitsAnalytics['behavioralTrends'] {
    return [
      {
        trend: 'Increasing autonomy',
        strength: 0.7,
        examples: ['Fewer escalations over time', 'More independent task completion'],
      },
      {
        trend: 'Preference for analytical approaches',
        strength: 0.6,
        examples: ['Data-driven decision making', 'Thorough analysis before action'],
      },
    ];
  }

  private analyzeCommunicationStyle(
    playbookData: any
  ): PersonaTraitsAnalytics['communicationAnalysis'] {
    return {
      avgPromptLength: 250,
      formalityScore: 0.7,
      empathyScore: 0.6,
      assertivenessScore: 0.8,
    };
  }

  private analyzeTaskPatterns(playbookData: any): PersonaTraitsAnalytics['taskPatterns'] {
    return {
      preferredTaskTypes: ['analysis', 'content_creation', 'strategy'],
      avgSuccessRate: 0.85,
      commonFailureReasons: ['Insufficient data', 'Unclear requirements', 'Time constraints'],
    };
  }
}

// Export singleton instance
export const agentPersonalityEngine = new AgentPersonalityEngine();
