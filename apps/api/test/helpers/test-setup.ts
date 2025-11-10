/**
 * Test Setup Helpers
 * Provides utilities for setting up and tearing down test data
 */

import { supabase } from '../../src/lib/supabase';
import { faker } from '@faker-js/faker';

export interface TestOrganization {
  id: string;
  name: string;
  subscription_tier: string;
}

export interface TestUser {
  id: string;
  email: string;
  organization_id: string;
}

export interface TestSession {
  id: string;
  organization_id: string;
  user_id: string;
  status: string;
  current_step: string;
  completed_steps: string[];
}

/**
 * Create a test organization
 */
export async function createTestOrganization(
  subscriptionTier: 'TRIAL' | 'STARTER' | 'PRO' | 'PREMIUM' | 'ENTERPRISE' = 'TRIAL'
): Promise<TestOrganization> {
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name: faker.company.name(),
      subscription_tier: subscriptionTier,
      slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test organization: ${error.message}`);
  }

  return data;
}

/**
 * Create a test user
 */
export async function createTestUser(organizationId: string): Promise<TestUser> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      email: faker.internet.email(),
      organization_id: organizationId,
      name: faker.person.fullName(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return data;
}

/**
 * Create a test onboarding session
 */
export async function createTestSession(
  organizationId: string,
  userId: string,
  status: string = 'STARTED'
): Promise<TestSession> {
  const { data, error } = await supabase
    .from('onboarding_sessions')
    .insert({
      organization_id: organizationId,
      user_id: userId,
      status,
      current_step: 'BUSINESS_INFO',
      completed_steps: [],
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test session: ${error.message}`);
  }

  return data;
}

/**
 * Delete test organization and all related data
 */
export async function cleanupTestOrganization(organizationId: string) {
  // Delete in reverse dependency order
  await supabase.from('onboarding_sessions').delete().eq('organization_id', organizationId);
  await supabase.from('users').delete().eq('organization_id', organizationId);
  await supabase.from('organizations').delete().eq('id', organizationId);
}

/**
 * Delete test session
 */
export async function cleanupTestSession(sessionId: string) {
  await supabase.from('intake_responses').delete().eq('session_id', sessionId);
  await supabase.from('onboarding_agent_results').delete().eq('session_id', sessionId);
  await supabase.from('onboarding_sessions').delete().eq('id', sessionId);
}

/**
 * Generate valid intake data for testing
 */
export function generateIntakeData(step: string) {
  switch (step) {
    case 'BUSINESS_INFO':
      return {
        businessName: faker.company.name(),
        industry: faker.commerce.department(),
        website: faker.internet.url(),
        companySize: 'SMALL',
        foundedYear: 2020,
      };

    case 'GOALS':
      return {
        primaryGoals: ['Brand Awareness', 'Lead Generation'],
        successMetrics: ['Media Mentions', 'Website Traffic'],
        timeline: '6 months',
        budgetRange: '$5k-10k/mo',
      };

    case 'COMPETITORS':
      return {
        competitors: [
          {
            name: faker.company.name(),
            website: faker.internet.url(),
            strengths: 'Strong brand presence',
          },
        ],
        marketPosition: 'CHALLENGER',
        uniqueValueProposition: 'We offer superior customer service and faster delivery.',
      };

    case 'BRAND_VOICE':
      return {
        brandTone: ['Professional', 'Innovative'],
        brandAttributes: ['Trustworthy', 'Expert'],
        targetAudience: {
          demographics: {
            ageRange: '30-50',
            location: 'North America',
            jobTitles: ['CTO', 'VP Engineering'],
            industries: ['Technology', 'Finance'],
          },
          psychographics: {
            interests: ['Innovation', 'Efficiency'],
            challenges: ['Scaling', 'Security'],
            goals: ['Growth', 'Market leadership'],
          },
          painPoints: ['High costs', 'Slow time to market'],
        },
        brandPersonality: 'Approachable expert who simplifies complex technology',
      };

    case 'CHANNELS':
      return {
        prPriority: 4,
        contentPriority: 5,
        seoPriority: 3,
        preferredContentTypes: ['Blog Posts', 'Case Studies', 'Whitepapers'],
      };

    case 'REGIONS':
      return {
        primaryRegions: ['North America', 'Europe'],
        languages: ['English', 'Spanish'],
        localConsiderations: 'Consider GDPR compliance for European markets',
      };

    default:
      return {};
  }
}

/**
 * Generate auth token for testing (mock JWT)
 */
export function generateTestAuthToken(userId: string, organizationId: string): string {
  // In a real implementation, this would use jsonwebtoken to create a valid JWT
  // For testing, we'll create a simple token that can be validated by the test middleware
  return Buffer.from(JSON.stringify({ userId, organizationId })).toString('base64');
}
