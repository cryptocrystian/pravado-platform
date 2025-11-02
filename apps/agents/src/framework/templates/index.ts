// =====================================================
// AGENT TEMPLATES INDEX
// =====================================================

import { RegisteredAgent } from '@pravado/shared-types';
import { prCampaignTemplate } from './pr-campaign.template';
import { contentBriefTemplate } from './content-brief.template';

// =====================================================
// ALL TEMPLATES EXPORT
// =====================================================

export const allAgentTemplates: RegisteredAgent[] = [prCampaignTemplate, contentBriefTemplate];

// =====================================================
// RE-EXPORTS
// =====================================================

export * from './pr-campaign.template';
export * from './content-brief.template';
