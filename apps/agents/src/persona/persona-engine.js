"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.personaEngine = exports.PersonaEngine = void 0;
const events_1 = require("events");
const supabase_js_1 = require("@supabase/supabase-js");
const openai_1 = __importDefault(require("openai"));
const timeline_engine_1 = require("../timeline/timeline-engine");
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
class PersonaEngine extends events_1.EventEmitter {
    async inferPersona(input) {
        if (!input.forceRefresh) {
            const existing = await this.getContactPersona(input.contactId, input.organizationId);
            if (existing && existing.confidenceScore > 0.7) {
                return {
                    contactId: input.contactId,
                    persona: existing.persona,
                    confidence: existing.confidenceScore,
                    confidenceLevel: existing.confidenceLevel,
                    inferenceSignals: existing.inferenceSignals,
                    assignmentSource: existing.assignmentSource,
                };
            }
        }
        const { data: matchResult, error } = await supabase.rpc('match_contact_to_persona', {
            p_contact_id: input.contactId,
            p_organization_id: input.organizationId,
        });
        if (error) {
            throw new Error(`Failed to match persona: ${error.message}`);
        }
        const match = matchResult;
        const persona = await this.getPersonaDefinition(match.personaId);
        if (!persona) {
            throw new Error('Matched persona not found');
        }
        await this.upsertContactPersona({
            contactId: input.contactId,
            organizationId: input.organizationId,
            personaId: match.personaId,
            confidence: match.confidence,
            signals: match.signals,
            source: 'INFERRED',
        });
        await timeline_engine_1.timelineEngine.logEvent({
            organizationId: input.organizationId,
            contactId: input.contactId,
            eventType: 'PERSONA_INFERRED',
            title: `Persona identified: ${persona.name}`,
            description: `System inferred ${persona.name} persona with ${Math.round(match.confidence * 100)}% confidence`,
            metadata: {
                personaId: persona.id,
                personaName: persona.name,
                confidence: match.confidence,
                signals: match.signals,
            },
        });
        this.emit('persona-inferred', {
            contactId: input.contactId,
            persona,
            confidence: match.confidence,
        });
        return {
            contactId: input.contactId,
            persona,
            confidence: match.confidence,
            confidenceLevel: this.getConfidenceLevel(match.confidence),
            inferenceSignals: match.signals,
            assignmentSource: 'INFERRED',
        };
    }
    async overridePersona(input) {
        const { contactId, organizationId, personaId, reason, setBy } = input;
        const current = await this.getContactPersona(contactId, organizationId);
        const newPersona = await this.getPersonaDefinition(personaId);
        if (!newPersona) {
            throw new Error('Persona not found');
        }
        await supabase.rpc('log_persona_override_event', {
            p_contact_id: contactId,
            p_organization_id: organizationId,
            p_old_persona_id: current?.personaId,
            p_new_persona_id: personaId,
            p_initiated_by: setBy,
            p_reason: reason,
        });
        await this.upsertContactPersona({
            contactId,
            organizationId,
            personaId,
            confidence: 0.9,
            signals: { manual_override: true, reason },
            source: 'MANUAL',
            assignedBy: setBy,
            isVerified: true,
        });
        await timeline_engine_1.timelineEngine.logEvent({
            organizationId,
            contactId,
            eventType: 'PERSONA_OVERRIDDEN',
            title: `Persona manually set to ${newPersona.name}`,
            description: reason || `User manually assigned ${newPersona.name} persona`,
            metadata: {
                oldPersonaId: current?.personaId,
                newPersonaId: personaId,
                reason,
                setBy,
            },
        });
        this.emit('persona-overridden', {
            contactId,
            oldPersona: current?.persona,
            newPersona,
        });
        return this.getPersonaProfile(contactId, organizationId);
    }
    async overrideTone(input) {
        const { contactId, organizationId, preferredTone, preferredVoice, reason, appliesToCampaigns, setBy } = input;
        const { error } = await supabase
            .from('user_voice_preferences')
            .upsert({
            organization_id: organizationId,
            contact_id: contactId,
            preferred_tone: preferredTone,
            preferred_voice: preferredVoice,
            override_reason: reason,
            applies_to_campaigns: appliesToCampaigns,
            set_by: setBy,
        });
        if (error) {
            throw new Error(`Failed to set voice preference: ${error.message}`);
        }
        this.emit('tone-overridden', {
            contactId,
            tone: preferredTone,
            voice: preferredVoice,
        });
    }
    async getAdaptiveStrategy(input) {
        const { data, error } = await supabase.rpc('get_adaptive_strategy_for_contact', {
            p_contact_id: input.contactId,
            p_organization_id: input.organizationId,
            p_use_case_tag: input.useCaseTag,
        });
        if (error) {
            throw new Error(`Failed to get adaptive strategy: ${error.message}`);
        }
        const strategy = {
            personaId: data.persona_id,
            personaName: data.persona_name,
            tone: data.tone,
            voice: data.voice,
            strategyNotes: data.strategy_notes,
            messagingFocus: data.messaging_focus,
            confidence: data.confidence,
            confidenceLevel: data.confidence_level,
            isVerified: data.is_verified,
            overridden: data.overridden,
            overrideReason: data.override_reason,
            effectivenessScore: data.effectiveness_score,
        };
        return strategy;
    }
    async updateFromEngagement(input) {
        const { error } = await supabase.rpc('update_persona_based_on_engagement', {
            p_contact_id: input.contactId,
            p_organization_id: input.organizationId,
            p_interaction_type: input.interactionType,
            p_sentiment_score: input.sentimentScore,
            p_response_positive: input.responsePositive,
        });
        if (error) {
            throw new Error(`Failed to update persona from engagement: ${error.message}`);
        }
        this.emit('persona-updated-from-engagement', {
            contactId: input.contactId,
            interactionType: input.interactionType,
            responsePositive: input.responsePositive,
        });
        return true;
    }
    async getPersonaDefinition(personaId) {
        const { data, error } = await supabase
            .from('persona_definitions')
            .select('*')
            .eq('id', personaId)
            .eq('is_active', true)
            .single();
        if (error || !data) {
            return null;
        }
        return this.mapPersonaDefinitionFromDb(data);
    }
    async listPersonaDefinitions() {
        const { data, error } = await supabase
            .from('persona_definitions')
            .select('*')
            .eq('is_active', true)
            .order('name');
        if (error) {
            throw new Error(`Failed to list personas: ${error.message}`);
        }
        return (data || []).map((d) => this.mapPersonaDefinitionFromDb(d));
    }
    async getContactPersona(contactId, organizationId) {
        const { data, error } = await supabase
            .from('contact_personas')
            .select('*, persona:persona_id (*)')
            .eq('contact_id', contactId)
            .eq('organization_id', organizationId)
            .single();
        if (error || !data) {
            return null;
        }
        return this.mapContactPersonaFromDb(data);
    }
    async getPersonaProfile(contactId, organizationId) {
        const contactPersona = await this.getContactPersona(contactId, organizationId);
        if (!contactPersona) {
            const inference = await this.inferPersona({ contactId, organizationId });
            contactPersona = await this.getContactPersona(contactId, organizationId);
        }
        if (!contactPersona) {
            throw new Error('Failed to get or create persona');
        }
        const strategy = await this.getAdaptiveStrategy({ contactId, organizationId });
        const { data: contact } = await supabase
            .from('contacts')
            .select('name, email')
            .eq('id', contactId)
            .single();
        const { data: voicePref } = await supabase
            .from('user_voice_preferences')
            .select('*')
            .eq('contact_id', contactId)
            .eq('organization_id', organizationId)
            .single();
        const profile = {
            contactId,
            contactName: contact?.name,
            contactEmail: contact?.email,
            persona: contactPersona.persona,
            confidence: contactPersona.confidenceScore,
            confidenceLevel: contactPersona.confidenceLevel,
            adaptiveStrategy: strategy,
            messagesSent: contactPersona.messagesSent,
            effectivenessScore: contactPersona.effectivenessScore,
            hasOverride: !!voicePref,
            overrideReason: voicePref?.override_reason,
            lastUpdatedAt: contactPersona.lastUpdatedAt,
        };
        return profile;
    }
    async analyzeContactBehaviorWithGPT(contactId, organizationId) {
        const { data: messages } = await supabase
            .from('channel_interactions')
            .select('content, sentiment, response_type, created_at')
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false })
            .limit(20);
        if (!messages || messages.length === 0) {
            throw new Error('Not enough interaction data for GPT analysis');
        }
        const prompt = this.buildPersonaAnalysisPrompt(messages);
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert in personality analysis and communication styles. Analyze interaction patterns to identify the best-fit persona archetype.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const response = completion.choices[0].message.content || '{}';
        const parsed = JSON.parse(response);
        return {
            suggestedPersona: parsed.persona || 'Amiable',
            reasoning: parsed.reasoning || '',
            confidence: parsed.confidence || 0.5,
        };
    }
    buildPersonaAnalysisPrompt(messages) {
        let prompt = 'Analyze these interactions to determine the contact\'s persona archetype.\n\n';
        prompt += 'Available personas:\n';
        prompt += '- Analytical: Data-driven, precise, methodical\n';
        prompt += '- Warm: Empathetic, relationship-focused, patient\n';
        prompt += '- Assertive: Direct, confident, results-oriented\n';
        prompt += '- Expressive: Enthusiastic, creative, energetic\n';
        prompt += '- Amiable: Collaborative, supportive, harmonious\n\n';
        prompt += 'Recent interactions:\n';
        messages.forEach((msg, idx) => {
            prompt += `${idx + 1}. ${msg.content?.substring(0, 200)} (Sentiment: ${msg.sentiment || 'unknown'})\n`;
        });
        prompt += '\nProvide response in JSON format with:\n';
        prompt += '- persona: Best-fit persona name\n';
        prompt += '- reasoning: Brief explanation (2-3 sentences)\n';
        prompt += '- confidence: Score from 0.0 to 1.0\n';
        return prompt;
    }
    generatePromptContext(strategy) {
        let context = `**Persona Context:**\n`;
        context += `Recipient persona: ${strategy.personaName}\n`;
        context += `Communication style: ${strategy.tone} tone, ${strategy.voice} voice\n\n`;
        context += `**Strategy:**\n`;
        if (strategy.strategyNotes) {
            context += `${strategy.strategyNotes}\n`;
        }
        if (strategy.messagingFocus && strategy.messagingFocus.length > 0) {
            context += `Focus on: ${strategy.messagingFocus.join(', ')}\n`;
        }
        context += `\n**Confidence:** ${Math.round(strategy.confidence * 100)}% (${strategy.confidenceLevel})\n`;
        if (strategy.overridden) {
            context += `\n*Note: Tone manually adjusted by user*\n`;
        }
        return context;
    }
    async upsertContactPersona(params) {
        const { error } = await supabase
            .from('contact_personas')
            .upsert({
            organization_id: params.organizationId,
            contact_id: params.contactId,
            persona_id: params.personaId,
            confidence_score: params.confidence,
            assignment_source: params.source,
            assigned_by: params.assignedBy,
            inference_signals: params.signals,
            is_verified: params.isVerified || false,
            last_updated_at: new Date().toISOString(),
        });
        if (error) {
            throw new Error(`Failed to upsert contact persona: ${error.message}`);
        }
    }
    getConfidenceLevel(score) {
        if (score >= 0.8)
            return 'HIGH';
        if (score >= 0.5)
            return 'MEDIUM';
        return 'LOW';
    }
    mapPersonaDefinitionFromDb(data) {
        return {
            id: data.id,
            name: data.name,
            description: data.description,
            defaultTone: data.default_tone,
            defaultVoice: data.default_voice,
            characteristics: data.characteristics || {},
            doList: data.do_list || [],
            dontList: data.dont_list || [],
            examplePhrases: data.example_phrases || [],
            isSystemPersona: data.is_system_persona,
            isActive: data.is_active,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    }
    mapContactPersonaFromDb(data) {
        return {
            id: data.id,
            organizationId: data.organization_id,
            contactId: data.contact_id,
            personaId: data.persona_id,
            persona: data.persona ? this.mapPersonaDefinitionFromDb(data.persona) : undefined,
            confidenceScore: data.confidence_score,
            confidenceLevel: data.confidence_level,
            assignmentSource: data.assignment_source,
            assignedBy: data.assigned_by,
            inferenceSignals: data.inference_signals || {},
            behavioralStats: data.behavioral_stats || {},
            messagesSent: data.messages_sent || 0,
            positiveResponses: data.positive_responses || 0,
            negativeResponses: data.negative_responses || 0,
            effectivenessScore: data.effectiveness_score,
            isVerified: data.is_verified,
            lastUpdatedAt: data.last_updated_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    }
}
exports.PersonaEngine = PersonaEngine;
exports.personaEngine = new PersonaEngine();
//# sourceMappingURL=persona-engine.js.map