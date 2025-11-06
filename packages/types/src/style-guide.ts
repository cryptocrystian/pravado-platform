export interface StyleGuide {
  id: string;
  name: string;
  description: string | null;
  toneGuidelines: string | null;
  voiceCharacteristics: VoiceCharacteristics;
  formattingRules: FormattingRules;
  vocabularyPreferences: VocabularyPreferences;
  examples: StyleExample[];
  dosAndDonts: DosAndDonts;
  isDefault: boolean;
  organizationId: string;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface VoiceCharacteristics {
  tone?: string[];
  attributes?: string[];
  personality?: string;
  targetAudience?: string;
}

export interface FormattingRules {
  headingStyle?: string;
  listStyle?: string;
  dateFormat?: string;
  numberFormat?: string;
  customRules?: Record<string, string>;
}

export interface VocabularyPreferences {
  preferredTerms?: Record<string, string>;
  avoidedTerms?: string[];
  brandTerms?: Record<string, string>;
  industryJargon?: Record<string, string>;
}

export interface StyleExample {
  category: string;
  goodExample: string;
  badExample?: string;
  explanation: string;
}

export interface DosAndDonts {
  dos: string[];
  donts: string[];
}

export type CreateStyleGuideInput = Pick<StyleGuide, 'name' | 'organizationId'> & {
  description?: string;
  toneGuidelines?: string;
  voiceCharacteristics?: VoiceCharacteristics;
  formattingRules?: FormattingRules;
  vocabularyPreferences?: VocabularyPreferences;
  examples?: StyleExample[];
  dosAndDonts?: DosAndDonts;
  isDefault?: boolean;
};

export type UpdateStyleGuideInput = Partial<
  Omit<StyleGuide, 'id' | 'organizationId' | 'createdBy' | 'createdAt'>
>;
