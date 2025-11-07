// =====================================================
// PR CAMPAIGN SERVICE
// =====================================================
// Service layer for PR campaign management, press releases, and AI pitch generation

import { supabase } from '../lib/supabase';
import OpenAI from 'openai';
import {
  PRCampaign,
  PressRelease,
  CampaignInteraction,
  PitchTemplate,
  CreatePRCampaignInput,
  UpdatePRCampaignInput,
  CreatePressReleaseInput,
  UpdatePressReleaseInput,
  CreateCampaignInteractionInput,
  UpdateCampaignInteractionInput,
  CreatePitchTemplateInput,
  UpdatePitchTemplateInput,
  CampaignStats,
  PressReleaseStats,
  GeneratedPitch,
  RecommendedTarget,
  Contact,
} from '@pravado/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =====================================================
// CAMPAIGN OPERATIONS
// =====================================================

export async function createCampaign(
  input: CreatePRCampaignInput,
  userId: string
): Promise<PRCampaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      ...input,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create campaign: ${error.message}`);
  return mapCampaignFromDb(data);
}

export async function getCampaignById(
  campaignId: string,
  organizationId: string
): Promise<PRCampaign | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select()
    .eq('id', campaignId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get campaign: ${error.message}`);
  }

  return mapCampaignFromDb(data);
}

export async function listCampaigns(
  organizationId: string,
  filters?: {
    status?: string;
    teamId?: string;
    ownerId?: string;
  }
): Promise<PRCampaign[]> {
  let query = supabase
    .from('campaigns')
    .select()
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.teamId) {
    query = query.eq('team_id', filters.teamId);
  }
  if (filters?.ownerId) {
    query = query.eq('owner_id', filters.ownerId);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to list campaigns: ${error.message}`);
  return (data || []).map(mapCampaignFromDb);
}

export async function updateCampaign(
  campaignId: string,
  input: UpdatePRCampaignInput,
  userId: string,
  organizationId: string
): Promise<PRCampaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .update({
      ...input,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw new Error(`Failed to update campaign: ${error.message}`);
  return mapCampaignFromDb(data);
}

export async function deleteCampaign(
  campaignId: string,
  organizationId: string
): Promise<void> {
  const { error } = await supabase
    .from('campaigns')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', campaignId)
    .eq('organization_id', organizationId);

  if (error) throw new Error(`Failed to delete campaign: ${error.message}`);
}

export async function getCampaignStats(
  campaignId: string,
  organizationId: string
): Promise<CampaignStats> {
  const { data, error } = await supabase.rpc('get_campaign_stats', {
    campaign_uuid: campaignId,
  });

  if (error) throw new Error(`Failed to get campaign stats: ${error.message}`);

  // Verify ownership
  const campaign = await getCampaignById(campaignId, organizationId);
  if (!campaign) {
    throw new Error('Campaign not found or access denied');
  }

  return {
    totalReleases: data.total_releases || 0,
    totalPitches: data.total_pitches || 0,
    totalOpens: data.total_opens || 0,
    totalClicks: data.total_clicks || 0,
    totalReplies: data.total_replies || 0,
    totalCoverage: data.total_coverage || 0,
    openRate: data.open_rate || 0,
    replyRate: data.reply_rate || 0,
    coverageRate: data.coverage_rate || 0,
  };
}

// =====================================================
// PRESS RELEASE OPERATIONS
// =====================================================

export async function createPressRelease(
  input: CreatePressReleaseInput,
  userId: string
): Promise<PressRelease> {
  // Generate AI summary and headline variants
  const aiContent = await generateAiContent(input.bodyMd, input.title);

  const { data, error } = await supabase
    .from('press_releases')
    .insert({
      ...input,
      ai_summary: aiContent.summary,
      ai_headline_variants: aiContent.headlineVariants,
      key_messages: aiContent.keyMessages,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create press release: ${error.message}`);
  return mapPressReleaseFromDb(data);
}

export async function getPressReleaseById(
  releaseId: string,
  organizationId: string
): Promise<PressRelease | null> {
  const { data, error } = await supabase
    .from('press_releases')
    .select()
    .eq('id', releaseId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get press release: ${error.message}`);
  }

  return mapPressReleaseFromDb(data);
}

export async function listPressReleases(
  organizationId: string,
  filters?: {
    campaignId?: string;
    status?: string;
  }
): Promise<PressRelease[]> {
  let query = supabase
    .from('press_releases')
    .select()
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters?.campaignId) {
    query = query.eq('campaign_id', filters.campaignId);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to list press releases: ${error.message}`);
  return (data || []).map(mapPressReleaseFromDb);
}

export async function updatePressRelease(
  releaseId: string,
  input: UpdatePressReleaseInput,
  userId: string,
  organizationId: string
): Promise<PressRelease> {
  // If bodyMd or title changed, regenerate AI content
  let aiUpdate = {};
  if (input.bodyMd || input.title) {
    const release = await getPressReleaseById(releaseId, organizationId);
    if (!release) throw new Error('Press release not found');

    const bodyMd = input.bodyMd || release.bodyMd;
    const title = input.title || release.title;
    const aiContent = await generateAiContent(bodyMd, title);

    aiUpdate = {
      ai_summary: aiContent.summary,
      ai_headline_variants: aiContent.headlineVariants,
      key_messages: aiContent.keyMessages,
    };
  }

  const { data, error } = await supabase
    .from('press_releases')
    .update({
      ...input,
      ...aiUpdate,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', releaseId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw new Error(`Failed to update press release: ${error.message}`);
  return mapPressReleaseFromDb(data);
}

export async function deletePressRelease(
  releaseId: string,
  organizationId: string
): Promise<void> {
  const { error } = await supabase
    .from('press_releases')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', releaseId)
    .eq('organization_id', organizationId);

  if (error) throw new Error(`Failed to delete press release: ${error.message}`);
}

export async function getPressReleaseStats(
  releaseId: string,
  organizationId: string
): Promise<PressReleaseStats> {
  // Verify ownership
  const release = await getPressReleaseById(releaseId, organizationId);
  if (!release) throw new Error('Press release not found');

  // Get interactions for this release
  const { data: interactions, error } = await supabase
    .from('campaign_interactions')
    .select('contact_id, interaction_type, opened_at, clicked_at, replied_at, coverage_url, created_at')
    .eq('press_release_id', releaseId)
    .eq('organization_id', organizationId);

  if (error) throw new Error(`Failed to get release stats: ${error.message}`);

  const pitchCount = interactions?.filter((i) => i.interaction_type === 'PITCH_SENT').length || 0;
  const openCount = interactions?.filter((i) => i.opened_at).length || 0;
  const clickCount = interactions?.filter((i) => i.clicked_at).length || 0;
  const replyCount = interactions?.filter((i) => i.replied_at).length || 0;
  const coverageCount = interactions?.filter((i) => i.coverage_url).length || 0;

  // Get top contacts
  const contactCounts: Record<string, { count: number; lastInteraction: Date }> = {};
  interactions?.forEach((i) => {
    if (!contactCounts[i.contact_id]) {
      contactCounts[i.contact_id] = { count: 0, lastInteraction: new Date(i.created_at) };
    }
    contactCounts[i.contact_id].count++;
    const interactionDate = new Date(i.created_at);
    if (interactionDate > contactCounts[i.contact_id].lastInteraction) {
      contactCounts[i.contact_id].lastInteraction = interactionDate;
    }
  });

  const topContactIds = Object.entries(contactCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([id]) => id);

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, full_name')
    .in('id', topContactIds);

  const topContacts = topContactIds.map((id) => {
    const contact = contacts?.find((c) => c.id === id);
    return {
      contactId: id,
      contactName: contact?.full_name || 'Unknown',
      interactionCount: contactCounts[id].count,
      lastInteraction: contactCounts[id].lastInteraction,
    };
  });

  return {
    pitchCount,
    openCount,
    clickCount,
    replyCount,
    coverageCount,
    openRate: pitchCount > 0 ? openCount / pitchCount : 0,
    clickRate: openCount > 0 ? clickCount / openCount : 0,
    replyRate: pitchCount > 0 ? replyCount / pitchCount : 0,
    coverageRate: pitchCount > 0 ? coverageCount / pitchCount : 0,
    topContacts,
  };
}

// =====================================================
// AI PITCH GENERATION
// =====================================================

export async function generatePitch(
  pressReleaseId: string,
  contactId: string,
  organizationId: string,
  templateId?: string,
  customInstructions?: string
): Promise<GeneratedPitch> {
  // Get press release
  const release = await getPressReleaseById(pressReleaseId, organizationId);
  if (!release) throw new Error('Press release not found');

  // Get contact details
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .eq('organization_id', organizationId)
    .single();

  if (contactError) throw new Error('Contact not found');

  // Get template if provided
  let template: PitchTemplate | null = null;
  if (templateId) {
    const { data: templateData } = await supabase
      .from('pitch_templates')
      .select()
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .single();

    if (templateData) {
      template = mapPitchTemplateFromDb(templateData);
    }
  }

  // Generate pitch using GPT-4
  const systemPrompt = template?.aiPrompt || `You are an expert PR professional writing personalized pitches to media contacts.

Your goal is to craft compelling, concise email pitches that:
1. Grab attention with a personalized opening
2. Clearly explain the news value and relevance to the recipient
3. Include a clear call-to-action
4. Maintain a professional yet conversational tone
5. Keep the pitch under 200 words

Output format:
{
  "subject": "Email subject line (under 60 characters)",
  "body": "Full email body in markdown format",
  "personalization": {
    "key": "value pairs of personalization data used"
  }
}`;

  const userPrompt = `Generate a personalized pitch for this press release to the following contact:

PRESS RELEASE:
Title: ${release.title}
${release.subtitle ? `Subtitle: ${release.subtitle}` : ''}

Summary: ${release.aiSummary || 'No summary available'}

Key Messages:
${release.keyMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Full Content (first 1000 chars):
${release.bodyMd.substring(0, 1000)}...

CONTACT DETAILS:
Name: ${contact.full_name}
Title: ${contact.title || 'Unknown'}
Outlet: ${contact.outlet || 'Unknown'}
Topics: ${contact.topics?.join(', ') || 'Unknown'}
Bio: ${contact.bio || 'No bio available'}

${customInstructions ? `CUSTOM INSTRUCTIONS:\n${customInstructions}\n\n` : ''}

Generate a personalized pitch that appeals to this contact's interests and beat.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const result = JSON.parse(completion.choices[0].message.content || '{}');

  return {
    subject: result.subject || `Re: ${release.title}`,
    body: result.body || '',
    personalizationData: result.personalization || {},
    confidence: 0.85, // Could be calculated based on various factors
  };
}

// =====================================================
// TARGETING & RECOMMENDATIONS
// =====================================================

export async function getRecommendedTargets(
  pressReleaseId: string,
  organizationId: string,
  maxResults: number = 50,
  minScore: number = 0.5
): Promise<RecommendedTarget[]> {
  // Verify ownership
  const release = await getPressReleaseById(pressReleaseId, organizationId);
  if (!release) throw new Error('Press release not found');

  const { data, error } = await supabase.rpc('get_recommended_targets', {
    release_uuid: pressReleaseId,
    max_results: maxResults,
  });

  if (error) throw new Error(`Failed to get recommended targets: ${error.message}`);

  // Filter by min score and get contact details
  const targets = (data || [])
    .filter((t: any) => t.match_score >= minScore)
    .map((t: any) => ({
      contactId: t.contact_id,
      contactName: t.contact_name,
      contactOutlet: t.contact_outlet,
      contactTier: t.contact_tier,
      matchScore: parseFloat(t.match_score),
      matchReasons: t.match_reasons || [],
    }));

  return targets;
}

// =====================================================
// CAMPAIGN INTERACTIONS
// =====================================================

export async function createInteraction(
  input: CreateCampaignInteractionInput,
  userId: string
): Promise<CampaignInteraction> {
  const { data, error } = await supabase
    .from('campaign_interactions')
    .insert({
      ...input,
      user_id: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create interaction: ${error.message}`);
  return mapInteractionFromDb(data);
}

export async function updateInteraction(
  interactionId: string,
  input: UpdateCampaignInteractionInput,
  organizationId: string
): Promise<CampaignInteraction> {
  const { data, error } = await supabase
    .from('campaign_interactions')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', interactionId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update interaction: ${error.message}`);
  return mapInteractionFromDb(data);
}

export async function getInteractionsByContact(
  contactId: string,
  organizationId: string
): Promise<CampaignInteraction[]> {
  const { data, error } = await supabase
    .from('campaign_interactions')
    .select()
    .eq('contact_id', contactId)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to get interactions: ${error.message}`);
  return (data || []).map(mapInteractionFromDb);
}

// =====================================================
// PITCH TEMPLATES
// =====================================================

export async function createPitchTemplate(
  input: CreatePitchTemplateInput,
  userId: string
): Promise<PitchTemplate> {
  const { data, error } = await supabase
    .from('pitch_templates')
    .insert({
      ...input,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create pitch template: ${error.message}`);
  return mapPitchTemplateFromDb(data);
}

export async function listPitchTemplates(
  organizationId: string
): Promise<PitchTemplate[]> {
  const { data, error } = await supabase
    .from('pitch_templates')
    .select()
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list pitch templates: ${error.message}`);
  return (data || []).map(mapPitchTemplateFromDb);
}

export async function updatePitchTemplate(
  templateId: string,
  input: UpdatePitchTemplateInput,
  userId: string,
  organizationId: string
): Promise<PitchTemplate> {
  const { data, error } = await supabase
    .from('pitch_templates')
    .update({
      ...input,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw new Error(`Failed to update pitch template: ${error.message}`);
  return mapPitchTemplateFromDb(data);
}

export async function deletePitchTemplate(
  templateId: string,
  organizationId: string
): Promise<void> {
  const { error } = await supabase
    .from('pitch_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', templateId)
    .eq('organization_id', organizationId);

  if (error) throw new Error(`Failed to delete pitch template: ${error.message}`);
}

// =====================================================
// AI HELPERS
// =====================================================

async function generateAiContent(
  bodyMd: string,
  title: string
): Promise<{
  summary: string;
  headlineVariants: string[];
  keyMessages: string[];
}> {
  const systemPrompt = `You are an expert PR strategist analyzing press releases.

Your task is to:
1. Create a concise 2-3 sentence summary suitable for pitches
2. Generate 3 alternative headline variants that emphasize different angles
3. Extract 3-5 key messages/takeaways

Output format:
{
  "summary": "Brief summary text",
  "headlineVariants": ["Variant 1", "Variant 2", "Variant 3"],
  "keyMessages": ["Message 1", "Message 2", "Message 3"]
}`;

  const userPrompt = `Analyze this press release:

TITLE: ${title}

CONTENT:
${bodyMd.substring(0, 5000)}

Generate the summary, headline variants, and key messages.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const result = JSON.parse(completion.choices[0].message.content || '{}');

  return {
    summary: result.summary || '',
    headlineVariants: result.headlineVariants || [],
    keyMessages: result.keyMessages || [],
  };
}

// =====================================================
// MAPPERS (DB to Domain)
// =====================================================

function mapCampaignFromDb(data: any): PRCampaign {
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    goal: data.goal,
    status: data.status,
    startDate: data.start_date ? new Date(data.start_date) : null,
    endDate: data.end_date ? new Date(data.end_date) : null,
    targetImpressions: data.target_impressions,
    targetCoveragePieces: data.target_coverage_pieces,
    targetEngagementRate: data.target_engagement_rate,
    metrics: data.metrics || {},
    budget: data.budget,
    currency: data.currency,
    notes: data.notes,
    internalNotes: data.internal_notes,
    organizationId: data.organization_id,
    teamId: data.team_id,
    ownerId: data.owner_id,
    createdBy: data.created_by,
    updatedBy: data.updated_by,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    deletedAt: data.deleted_at ? new Date(data.deleted_at) : null,
  };
}

function mapPressReleaseFromDb(data: any): PressRelease {
  return {
    id: data.id,
    campaignId: data.campaign_id,
    title: data.title,
    slug: data.slug,
    subtitle: data.subtitle,
    bodyMd: data.body_md,
    bodyHtml: data.body_html,
    aiSummary: data.ai_summary,
    aiHeadlineVariants: data.ai_headline_variants || [],
    keyMessages: data.key_messages || [],
    metaTitle: data.meta_title,
    metaDescription: data.meta_description,
    tags: data.tags || [],
    status: data.status,
    embargoDate: data.embargo_date ? new Date(data.embargo_date) : null,
    publishedAt: data.published_at ? new Date(data.published_at) : null,
    sentAt: data.sent_at ? new Date(data.sent_at) : null,
    targetContactIds: data.target_contact_ids || [],
    targetTiers: data.target_tiers || [],
    targetTopics: data.target_topics || [],
    targetRegions: data.target_regions || [],
    targetingScoreThreshold: data.targeting_score_threshold,
    attachments: data.attachments || [],
    distributionChannels: data.distribution_channels || [],
    pitchCount: data.pitch_count,
    openCount: data.open_count,
    clickCount: data.click_count,
    replyCount: data.reply_count,
    coverageCount: data.coverage_count,
    organizationId: data.organization_id,
    createdBy: data.created_by,
    updatedBy: data.updated_by,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    deletedAt: data.deleted_at ? new Date(data.deleted_at) : null,
  };
}

function mapInteractionFromDb(data: any): CampaignInteraction {
  return {
    id: data.id,
    campaignId: data.campaign_id,
    pressReleaseId: data.press_release_id,
    contactId: data.contact_id,
    interactionType: data.interaction_type,
    channel: data.channel,
    pitchSubject: data.pitch_subject,
    pitchBody: data.pitch_body,
    personalizationData: data.personalization_data || {},
    sentAt: data.sent_at ? new Date(data.sent_at) : null,
    openedAt: data.opened_at ? new Date(data.opened_at) : null,
    clickedAt: data.clicked_at ? new Date(data.clicked_at) : null,
    repliedAt: data.replied_at ? new Date(data.replied_at) : null,
    responseSentiment: data.response_sentiment,
    responseText: data.response_text,
    notes: data.notes,
    coverageUrl: data.coverage_url,
    coverageTitle: data.coverage_title,
    coveragePublishedAt: data.coverage_published_at ? new Date(data.coverage_published_at) : null,
    metadata: data.metadata || {},
    organizationId: data.organization_id,
    userId: data.user_id,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

function mapPitchTemplateFromDb(data: any): PitchTemplate {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    templateType: data.template_type,
    subjectTemplate: data.subject_template,
    bodyTemplate: data.body_template,
    availableVariables: data.available_variables || [],
    aiPrompt: data.ai_prompt,
    usageCount: data.usage_count,
    avgOpenRate: data.avg_open_rate,
    avgReplyRate: data.avg_reply_rate,
    tags: data.tags || [],
    isDefault: data.is_default,
    organizationId: data.organization_id,
    createdBy: data.created_by,
    updatedBy: data.updated_by,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    deletedAt: data.deleted_at ? new Date(data.deleted_at) : null,
  };
}
