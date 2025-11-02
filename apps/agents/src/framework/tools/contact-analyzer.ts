// =====================================================
// CONTACT ANALYZER TOOL
// =====================================================
// Analyze and score contacts for targeting

import { AgentTool, AgentContext } from '@pravado/shared-types';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

// =====================================================
// SCORE CONTACTS
// =====================================================

export const scoreContactsTool: AgentTool = {
  name: 'score-contacts',
  description: 'Score contacts based on criteria and return ranked list',
  inputSchema: {
    criteria: {
      type: 'object',
      description: 'Scoring criteria',
      properties: {
        tier: { type: 'string', optional: true },
        topics: { type: 'array', optional: true },
        regions: { type: 'array', optional: true },
      },
    },
    limit: { type: 'number', optional: true, description: 'Max contacts to return (default 50)' },
  },
  execute: async (input: any, context: AgentContext) => {
    logger.info(`[ContactAnalyzer] Scoring contacts for org: ${context.organizationId}`);

    // Fetch all contacts
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', context.organizationId)
      .is('deleted_at', null);

    if (error) {
      logger.error(`[ContactAnalyzer] Error fetching contacts: ${error.message}`);
      return { error: error.message };
    }

    if (!contacts || contacts.length === 0) {
      return { scoredContacts: [], count: 0 };
    }

    const criteria = input.criteria || {};

    // Score each contact
    const scoredContacts = contacts
      .map((contact) => {
        let score = 0;

        // Tier scoring (TIER_1 = 1.0, TIER_2 = 0.6, TIER_3 = 0.3)
        if (criteria.tier && contact.tier === criteria.tier) {
          if (contact.tier === 'TIER_1') score += 1.0;
          else if (contact.tier === 'TIER_2') score += 0.6;
          else if (contact.tier === 'TIER_3') score += 0.3;
        }

        // Topics overlap (0.8 weight)
        if (criteria.topics && criteria.topics.length > 0 && contact.topics) {
          const overlap = criteria.topics.filter((t: string) => contact.topics.includes(t)).length;
          const topicScore = (overlap / criteria.topics.length) * 0.8;
          score += topicScore;
        }

        // Regions overlap (0.6 weight)
        if (criteria.regions && criteria.regions.length > 0 && contact.regions) {
          const overlap = criteria.regions.filter((r: string) => contact.regions.includes(r)).length;
          const regionScore = (overlap / criteria.regions.length) * 0.6;
          score += regionScore;
        }

        return {
          ...contact,
          matchScore: parseFloat(score.toFixed(2)),
        };
      })
      .filter((c) => c.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, input.limit || 50);

    logger.info(`[ContactAnalyzer] Scored ${scoredContacts.length} contacts`);

    return { scoredContacts, count: scoredContacts.length };
  },
};

// =====================================================
// ANALYZE CONTACT DISTRIBUTION
// =====================================================

export const analyzeContactDistributionTool: AgentTool = {
  name: 'analyze-contact-distribution',
  description: 'Analyze contact distribution across tiers, topics, and regions',
  inputSchema: {},
  execute: async (input: any, context: AgentContext) => {
    logger.info(`[ContactAnalyzer] Analyzing contact distribution for org: ${context.organizationId}`);

    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('tier, topics, regions, outlet_type')
      .eq('organization_id', context.organizationId)
      .is('deleted_at', null);

    if (error) {
      logger.error(`[ContactAnalyzer] Error fetching contacts: ${error.message}`);
      return { error: error.message };
    }

    if (!contacts || contacts.length === 0) {
      return { distribution: null };
    }

    // Count by tier
    const byTier = contacts.reduce((acc: any, c) => {
      acc[c.tier] = (acc[c.tier] || 0) + 1;
      return acc;
    }, {});

    // Count by outlet type
    const byOutletType = contacts.reduce((acc: any, c) => {
      if (c.outlet_type) {
        acc[c.outlet_type] = (acc[c.outlet_type] || 0) + 1;
      }
      return acc;
    }, {});

    // Top topics
    const topicCounts: Record<string, number> = {};
    contacts.forEach((c) => {
      if (c.topics) {
        c.topics.forEach((topic: string) => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });
      }
    });
    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    // Top regions
    const regionCounts: Record<string, number> = {};
    contacts.forEach((c) => {
      if (c.regions) {
        c.regions.forEach((region: string) => {
          regionCounts[region] = (regionCounts[region] || 0) + 1;
        });
      }
    });
    const topRegions = Object.entries(regionCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([region, count]) => ({ region, count }));

    const distribution = {
      total: contacts.length,
      byTier,
      byOutletType,
      topTopics,
      topRegions,
    };

    logger.info(`[ContactAnalyzer] Analyzed ${contacts.length} contacts`);

    return { distribution };
  },
};

// =====================================================
// FIND SIMILAR CONTACTS
// =====================================================

export const findSimilarContactsTool: AgentTool = {
  name: 'find-similar-contacts',
  description: 'Find contacts similar to a reference contact',
  inputSchema: {
    contactId: { type: 'string', description: 'Reference contact ID' },
    limit: { type: 'number', optional: true, description: 'Max contacts to return (default 20)' },
  },
  execute: async (input: any, context: AgentContext) => {
    logger.info(`[ContactAnalyzer] Finding similar contacts to: ${input.contactId}`);

    // Get reference contact
    const { data: reference, error: refError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', input.contactId)
      .eq('organization_id', context.organizationId)
      .single();

    if (refError || !reference) {
      logger.error(`[ContactAnalyzer] Error fetching reference contact: ${refError?.message}`);
      return { error: refError?.message || 'Reference contact not found' };
    }

    // Fetch all other contacts
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', context.organizationId)
      .neq('id', input.contactId)
      .is('deleted_at', null);

    if (error) {
      logger.error(`[ContactAnalyzer] Error fetching contacts: ${error.message}`);
      return { error: error.message };
    }

    if (!contacts || contacts.length === 0) {
      return { similarContacts: [], count: 0 };
    }

    // Calculate similarity scores
    const similarContacts = contacts
      .map((contact) => {
        let similarity = 0;

        // Same tier (0.3 weight)
        if (contact.tier === reference.tier) {
          similarity += 0.3;
        }

        // Same outlet type (0.2 weight)
        if (contact.outlet_type === reference.outlet_type) {
          similarity += 0.2;
        }

        // Topic overlap (0.3 weight)
        if (reference.topics && contact.topics) {
          const overlap = reference.topics.filter((t: string) => contact.topics.includes(t)).length;
          const total = new Set([...reference.topics, ...contact.topics]).size;
          similarity += (overlap / total) * 0.3;
        }

        // Region overlap (0.2 weight)
        if (reference.regions && contact.regions) {
          const overlap = reference.regions.filter((r: string) => contact.regions.includes(r)).length;
          const total = new Set([...reference.regions, ...contact.regions]).size;
          similarity += (overlap / total) * 0.2;
        }

        return {
          ...contact,
          similarityScore: parseFloat(similarity.toFixed(2)),
        };
      })
      .filter((c) => c.similarityScore > 0.3) // Only return reasonably similar contacts
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, input.limit || 20);

    logger.info(`[ContactAnalyzer] Found ${similarContacts.length} similar contacts`);

    return { similarContacts, count: similarContacts.length };
  },
};

// =====================================================
// EXPORT ALL TOOLS
// =====================================================

export const contactAnalyzerTools: AgentTool[] = [
  scoreContactsTool,
  analyzeContactDistributionTool,
  findSimilarContactsTool,
];
