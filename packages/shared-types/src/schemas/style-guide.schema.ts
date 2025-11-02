import { z } from 'zod';

export const VoiceCharacteristicsSchema = z.object({
  tone: z.array(z.string()).optional(),
  attributes: z.array(z.string()).optional(),
  personality: z.string().optional(),
  targetAudience: z.string().optional(),
});

export const FormattingRulesSchema = z.object({
  headingStyle: z.string().optional(),
  listStyle: z.string().optional(),
  dateFormat: z.string().optional(),
  numberFormat: z.string().optional(),
  customRules: z.record(z.string()).optional(),
});

export const VocabularyPreferencesSchema = z.object({
  preferredTerms: z.record(z.string()).optional(),
  avoidedTerms: z.array(z.string()).optional(),
  brandTerms: z.record(z.string()).optional(),
  industryJargon: z.record(z.string()).optional(),
});

export const StyleExampleSchema = z.object({
  category: z.string(),
  goodExample: z.string(),
  badExample: z.string().optional(),
  explanation: z.string(),
});

export const DosAndDontsSchema = z.object({
  dos: z.array(z.string()).default([]),
  donts: z.array(z.string()).default([]),
});

export const StyleGuideSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  toneGuidelines: z.string().nullable(),
  voiceCharacteristics: VoiceCharacteristicsSchema,
  formattingRules: FormattingRulesSchema,
  vocabularyPreferences: VocabularyPreferencesSchema,
  examples: z.array(StyleExampleSchema).default([]),
  dosAndDonts: DosAndDontsSchema,
  isDefault: z.boolean().default(false),
  organizationId: z.string().uuid(),
  createdBy: z.string().uuid(),
  updatedBy: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const CreateStyleGuideInputSchema = z.object({
  name: z.string().min(1).max(255),
  organizationId: z.string().uuid(),
  description: z.string().optional(),
  toneGuidelines: z.string().optional(),
  voiceCharacteristics: VoiceCharacteristicsSchema.optional(),
  formattingRules: FormattingRulesSchema.optional(),
  vocabularyPreferences: VocabularyPreferencesSchema.optional(),
  examples: z.array(StyleExampleSchema).optional(),
  dosAndDonts: DosAndDontsSchema.optional(),
  isDefault: z.boolean().optional(),
});

export const UpdateStyleGuideInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  toneGuidelines: z.string().optional(),
  voiceCharacteristics: VoiceCharacteristicsSchema.optional(),
  formattingRules: FormattingRulesSchema.optional(),
  vocabularyPreferences: VocabularyPreferencesSchema.optional(),
  examples: z.array(StyleExampleSchema).optional(),
  dosAndDonts: DosAndDontsSchema.optional(),
  isDefault: z.boolean().optional(),
});
