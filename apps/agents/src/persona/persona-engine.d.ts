import { EventEmitter } from 'events';
import type { PersonaDefinition, ContactPersona, PersonaProfile, AdaptiveVoiceStrategy, PersonaInferenceResult, InferPersonaInput, OverridePersonaInput, OverrideToneInput, UpdatePersonaFromEngagementInput, GetAdaptiveStrategyInput } from '@pravado/types';
export declare class PersonaEngine extends EventEmitter {
    inferPersona(input: InferPersonaInput): Promise<PersonaInferenceResult>;
    overridePersona(input: OverridePersonaInput): Promise<PersonaProfile>;
    overrideTone(input: OverrideToneInput): Promise<void>;
    getAdaptiveStrategy(input: GetAdaptiveStrategyInput): Promise<AdaptiveVoiceStrategy>;
    updateFromEngagement(input: UpdatePersonaFromEngagementInput): Promise<boolean>;
    getPersonaDefinition(personaId: string): Promise<PersonaDefinition | null>;
    listPersonaDefinitions(): Promise<PersonaDefinition[]>;
    getContactPersona(contactId: string, organizationId: string): Promise<ContactPersona | null>;
    getPersonaProfile(contactId: string, organizationId: string): Promise<PersonaProfile>;
    analyzeContactBehaviorWithGPT(contactId: string, organizationId: string): Promise<{
        suggestedPersona: string;
        reasoning: string;
        confidence: number;
    }>;
    private buildPersonaAnalysisPrompt;
    generatePromptContext(strategy: AdaptiveVoiceStrategy): string;
    private upsertContactPersona;
    private getConfidenceLevel;
    private mapPersonaDefinitionFromDb;
    private mapContactPersonaFromDb;
}
export declare const personaEngine: PersonaEngine;
//# sourceMappingURL=persona-engine.d.ts.map