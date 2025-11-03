// =====================================================
// AGENT PERSONALITY API ROUTES
// Sprint 44 Phase 3.5.4
// =====================================================
//
// Purpose: API endpoints for agent personality generation and application
// Provides: Persona generation, prompt modification, analytics
//

import express, { Request, Response } from 'express';
import { agentPersonalityEngine } from '../services/agentPersonalityEngine';
import { pool } from '../database/db';
import type {
  GeneratePersonaRequest,
  ApplyPersonalityRequest,
  GetPersonaTraitsRequest,
  AgentPersona,
  PersonaTraitsAnalytics,
  ApplyPersonalityResult,
} from '@pravado/shared-types';

const router = express.Router();

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Extract organization ID from request
 * In production, this would come from authenticated session
 */
function getOrganizationId(req: Request): string {
  // TODO: Extract from authenticated session
  return req.headers['x-organization-id'] as string || 'default-org-id';
}

/**
 * Validate required fields
 */
function validateRequired(
  res: Response,
  fields: Record<string, any>,
  requiredFields: string[]
): boolean {
  const missing = requiredFields.filter((field) => !fields[field]);
  if (missing.length > 0) {
    res.status(400).json({
      error: 'Missing required fields',
      missing,
    });
    return false;
  }
  return true;
}

// =====================================================
// PERSONA GENERATION ENDPOINTS
// =====================================================

/**
 * POST /api/agent-personality/generate
 * Generate agent persona from behavioral data
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    const request = req.body as GeneratePersonaRequest;

    // Validate required fields
    if (!validateRequired(res, request, ['agentId'])) {
      return;
    }

    // Ensure organizationId is set
    if (!request.organizationId) {
      request.organizationId = organizationId;
    }

    // Generate persona
    const persona: AgentPersona = await agentPersonalityEngine.generateAgentPersona(
      request.agentId,
      request.organizationId,
      request.options
    );

    res.status(200).json({
      success: true,
      persona,
      metadata: {
        agentId: request.agentId,
        organizationId: request.organizationId,
        confidenceScore: persona.confidenceScore,
        dataSourcesUsed: persona.metadata?.dataSourcesUsed || [],
        generatedAt: persona.metadata?.generatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error generating persona:', error);
    res.status(500).json({
      error: 'Failed to generate persona',
      message: error.message,
    });
  }
});

/**
 * POST /api/agent-personality/apply
 * Apply personality to prompt
 */
router.post('/apply', async (req: Request, res: Response) => {
  try {
    const { prompt, persona, options } = req.body as ApplyPersonalityRequest;

    // Validate required fields
    if (!validateRequired(res, req.body, ['prompt', 'persona'])) {
      return;
    }

    // Apply personality
    const result: ApplyPersonalityResult = agentPersonalityEngine.applyPersonalityToPrompt(
      prompt,
      persona,
      options
    );

    res.status(200).json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error applying personality:', error);
    res.status(500).json({
      error: 'Failed to apply personality to prompt',
      message: error.message,
    });
  }
});

// =====================================================
// ANALYTICS ENDPOINTS
// =====================================================

/**
 * POST /api/agent-personality/traits
 * Get persona traits analytics
 */
router.post('/traits', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    const request = req.body as GetPersonaTraitsRequest;

    // Validate required fields
    if (!validateRequired(res, request, ['agentId'])) {
      return;
    }

    // Ensure organizationId is set
    if (!request.organizationId) {
      request.organizationId = organizationId;
    }

    // Get analytics
    const analytics: PersonaTraitsAnalytics = await agentPersonalityEngine.getPersonaTraits(
      request.agentId,
      request.organizationId,
      request.analysisPeriodDays
    );

    res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error: any) {
    console.error('Error getting persona traits:', error);
    res.status(500).json({
      error: 'Failed to get persona traits',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-personality/profile/:agentId
 * Get active personality profile for an agent
 */
router.get('/profile/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const organizationId = getOrganizationId(req);

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM get_active_personality_profile($1)',
      [agentId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'No active profile found',
        message: `No personality profile found for agent ${agentId}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      profile: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      error: 'Failed to fetch personality profile',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-personality/profile/:agentId/version/:version
 * Get specific version of personality profile
 */
router.get('/profile/:agentId/version/:version', async (req: Request, res: Response) => {
  try {
    const { agentId, version } = req.params;

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM get_personality_profile_version($1, $2)',
      [agentId, parseInt(version)]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Profile version not found',
        message: `Version ${version} not found for agent ${agentId}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      profile: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching profile version:', error);
    res.status(500).json({
      error: 'Failed to fetch profile version',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-personality/evolution/:agentId
 * Get personality evolution timeline
 */
router.get('/evolution/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM get_personality_evolution($1, $2)',
      [agentId, limit]
    );

    res.status(200).json({
      success: true,
      evolution: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error fetching evolution:', error);
    res.status(500).json({
      error: 'Failed to fetch personality evolution',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-personality/by-tone/:tone
 * Find agents with specific tone
 */
router.get('/by-tone/:tone', async (req: Request, res: Response) => {
  try {
    const { tone } = req.params;
    const organizationId = getOrganizationId(req);
    const limit = parseInt(req.query.limit as string) || 10;

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM get_agents_by_tone($1, $2, $3)',
      [tone, organizationId, limit]
    );

    res.status(200).json({
      success: true,
      agents: result.rows,
      count: result.rows.length,
      tone,
    });
  } catch (error: any) {
    console.error('Error fetching agents by tone:', error);
    res.status(500).json({
      error: 'Failed to fetch agents by tone',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-personality/by-decision-style/:style
 * Find agents with specific decision style
 */
router.get('/by-decision-style/:style', async (req: Request, res: Response) => {
  try {
    const { style } = req.params;
    const organizationId = getOrganizationId(req);
    const limit = parseInt(req.query.limit as string) || 10;

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM get_agents_by_decision_style($1, $2, $3)',
      [style, organizationId, limit]
    );

    res.status(200).json({
      success: true,
      agents: result.rows,
      count: result.rows.length,
      decisionStyle: style,
    });
  } catch (error: any) {
    console.error('Error fetching agents by decision style:', error);
    res.status(500).json({
      error: 'Failed to fetch agents by decision style',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-personality/distribution
 * Get personality trait distribution across organization
 */
router.get('/distribution', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM get_personality_trait_distribution($1)',
      [organizationId]
    );

    // Group by trait type
    const grouped: Record<string, any[]> = {};
    result.rows.forEach((row: any) => {
      if (!grouped[row.trait_type]) {
        grouped[row.trait_type] = [];
      }
      grouped[row.trait_type].push({
        value: row.trait_value,
        count: parseInt(row.agent_count),
        percentage: parseFloat(row.percentage),
      });
    });

    res.status(200).json({
      success: true,
      distribution: grouped,
      totalTraitTypes: Object.keys(grouped).length,
    });
  } catch (error: any) {
    console.error('Error fetching distribution:', error);
    res.status(500).json({
      error: 'Failed to fetch personality distribution',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-personality/compare/:agentA/:agentB
 * Compare personalities of two agents
 */
router.get('/compare/:agentA/:agentB', async (req: Request, res: Response) => {
  try {
    const { agentA, agentB } = req.params;

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM compare_agent_personalities($1, $2)',
      [agentA, agentB]
    );

    const comparison = result.rows;
    const differences = comparison.filter((c: any) => c.is_different);
    const similarities = comparison.filter((c: any) => !c.is_different);

    // Calculate similarity score
    const similarityScore = similarities.length / comparison.length;

    res.status(200).json({
      success: true,
      comparison: {
        agentA: agentA,
        agentB: agentB,
        similarityScore: Math.round(similarityScore * 100) / 100,
        dimensions: comparison,
        differences: differences.length,
        similarities: similarities.length,
      },
    });
  } catch (error: any) {
    console.error('Error comparing personalities:', error);
    res.status(500).json({
      error: 'Failed to compare personalities',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-personality/profiles/:agentId/all
 * Get all profiles for an agent (history)
 */
router.get('/profiles/:agentId/all', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const organizationId = getOrganizationId(req);
    const limit = parseInt(req.query.limit as string) || 20;

    const query = `
      SELECT
        id,
        agent_id,
        tone,
        decision_style,
        collaboration_style,
        memory_style,
        user_alignment,
        confidence_score,
        is_active,
        version,
        created_at,
        updated_at
      FROM agent_personality_profiles
      WHERE agent_id = $1
        AND organization_id = $2
      ORDER BY version DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [agentId, organizationId, limit]);

    res.status(200).json({
      success: true,
      profiles: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error fetching all profiles:', error);
    res.status(500).json({
      error: 'Failed to fetch profiles',
      message: error.message,
    });
  }
});

/**
 * PUT /api/agent-personality/profile/:profileId/activate
 * Activate a specific personality profile
 */
router.put('/profile/:profileId/activate', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const organizationId = getOrganizationId(req);

    // Get the profile to activate
    const profileResult = await pool.query(
      'SELECT agent_id FROM agent_personality_profiles WHERE id = $1 AND organization_id = $2',
      [profileId, organizationId]
    );

    if (profileResult.rows.length === 0) {
      res.status(404).json({
        error: 'Profile not found',
        message: `Profile ${profileId} not found`,
      });
      return;
    }

    const agentId = profileResult.rows[0].agent_id;

    // Deactivate all other profiles for this agent
    await pool.query(
      'UPDATE agent_personality_profiles SET is_active = false WHERE agent_id = $1 AND organization_id = $2',
      [agentId, organizationId]
    );

    // Activate the selected profile
    await pool.query(
      'UPDATE agent_personality_profiles SET is_active = true, updated_at = NOW() WHERE id = $1',
      [profileId]
    );

    res.status(200).json({
      success: true,
      message: `Profile ${profileId} activated for agent ${agentId}`,
      profileId,
      agentId,
    });
  } catch (error: any) {
    console.error('Error activating profile:', error);
    res.status(500).json({
      error: 'Failed to activate profile',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/agent-personality/profile/:profileId
 * Delete a personality profile
 */
router.delete('/profile/:profileId', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const organizationId = getOrganizationId(req);

    // Check if profile is active
    const checkResult = await pool.query(
      'SELECT is_active FROM agent_personality_profiles WHERE id = $1 AND organization_id = $2',
      [profileId, organizationId]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({
        error: 'Profile not found',
        message: `Profile ${profileId} not found`,
      });
      return;
    }

    if (checkResult.rows[0].is_active) {
      res.status(400).json({
        error: 'Cannot delete active profile',
        message: 'Please activate another profile before deleting this one',
      });
      return;
    }

    // Delete profile
    await pool.query(
      'DELETE FROM agent_personality_profiles WHERE id = $1 AND organization_id = $2',
      [profileId, organizationId]
    );

    res.status(200).json({
      success: true,
      message: `Profile ${profileId} deleted`,
      profileId,
    });
  } catch (error: any) {
    console.error('Error deleting profile:', error);
    res.status(500).json({
      error: 'Failed to delete profile',
      message: error.message,
    });
  }
});

// =====================================================
// HEALTH CHECK
// =====================================================

/**
 * GET /api/agent-personality/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');

    // Check if agent_personality_profiles table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'agent_personality_profiles'
      );
    `);

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      table: tableCheck.rows[0].exists ? 'exists' : 'missing',
      service: 'agent-personality-engine',
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

export default router;
