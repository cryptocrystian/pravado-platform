// =====================================================
// PERSONA ROUTES
// Sprint 31: Persona intelligence & adaptive voice modeling
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as personaController from '../controllers/persona.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// PERSONA DEFINITION ROUTES
// =====================================================

/**
 * Get all persona definitions
 * GET /api/v1/personas
 */
router.get('/', personaController.getPersonas);

/**
 * Get single persona definition
 * GET /api/v1/personas/:personaId
 */
router.get('/:personaId', personaController.getPersona);

/**
 * Create new persona definition
 * POST /api/v1/personas
 * Body: CreatePersonaDefinitionInput
 */
router.post('/', personaController.createPersona);

/**
 * Update persona definition
 * PUT /api/v1/personas/:personaId
 * Body: UpdatePersonaDefinitionInput
 */
router.put('/:personaId', personaController.updatePersona);

/**
 * Delete persona definition (soft delete)
 * DELETE /api/v1/personas/:personaId
 */
router.delete('/:personaId', personaController.deletePersona);

/**
 * Get persona strategy by ID
 * GET /api/v1/personas/:personaId/strategy
 * Query: { useCaseTag? }
 */
router.get('/:personaId/strategy', personaController.getPersonaStrategy);

// =====================================================
// CONTACT PERSONA ROUTES
// =====================================================

/**
 * Get contact's persona profile
 * GET /api/v1/contacts/:contactId/persona
 */
router.get('/contacts/:contactId/persona', personaController.getContactPersona);

/**
 * Infer persona for a contact
 * POST /api/v1/contacts/:contactId/persona/infer
 * Body: { forceRefresh?: boolean }
 */
router.post('/contacts/:contactId/persona/infer', personaController.inferContactPersona);

/**
 * Override/manually set persona for contact
 * PUT /api/v1/contacts/:contactId/persona
 * Body: { personaId: string, reason?: string }
 */
router.put('/contacts/:contactId/persona', personaController.overrideContactPersona);

/**
 * Override tone/voice preference for contact
 * PUT /api/v1/contacts/:contactId/tone
 * Body: { preferredTone?: ToneArchetype, preferredVoice?: VoiceMode, reason?: string, appliesToCampaigns?: string[] }
 */
router.put('/contacts/:contactId/tone', personaController.overrideToneVoice);

/**
 * Update persona based on engagement feedback
 * POST /api/v1/contacts/:contactId/persona/engagement
 * Body: { interactionType: string, sentimentScore?: number, responsePositive?: boolean, campaignId?: string }
 */
router.post('/contacts/:contactId/persona/engagement', personaController.updateFromEngagement);

/**
 * Get adaptive strategy for contact
 * GET /api/v1/contacts/:contactId/adaptive-strategy
 * Query: { useCaseTag? }
 */
router.get('/contacts/:contactId/adaptive-strategy', personaController.getAdaptiveStrategy);

/**
 * Get persona event log for a contact
 * GET /api/v1/contacts/:contactId/persona/events
 * Query: { limit?: number, offset?: number }
 */
router.get('/contacts/:contactId/persona/events', personaController.getPersonaEvents);

export default router;
