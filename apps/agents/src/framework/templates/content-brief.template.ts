// =====================================================
// CONTENT BRIEF AGENT TEMPLATE
// =====================================================

import { RegisteredAgent, AgentCategory } from '@pravado/shared-types';
import { z } from 'zod';

export const contentBriefTemplate: RegisteredAgent = {
  id: 'content-brief-generator',
  name: 'Content Brief Generator',
  description: 'Generate detailed content briefs with SEO optimization, outlines, and keyword targeting',
  category: 'CONTENT' as AgentCategory,
  tags: ['content', 'seo', 'brief', 'planning'],
  version: '1.0.0',
  isActive: true,
  config: {
    agentName: 'Content Brief Generator',
    systemPrompt: `You are an expert content strategist and SEO specialist.

Your task is to create comprehensive content briefs that include:
- SEO-optimized titles and meta descriptions
- Detailed content outlines with H2/H3 structure
- Target keywords and semantic variations
- Recommended word count
- Target audience and tone guidance
- Internal/external linking suggestions
- Content goals and KPIs

Context available:
- Company strategy: {{context.strategy}}
- Keyword clusters: {{context.keywordClusters}}

Input data will include:
- Topic: {{input.topic}}
- Format: {{input.format}}
- Target keywords: {{input.targetKeywords}}

Generate a structured content brief in JSON format with the following schema:
{
  "title": "string",
  "slug": "string",
  "metaDescription": "string",
  "format": "BLOG|VIDEO|PODCAST|etc",
  "targetKeywords": {
    "primary": "string",
    "secondary": ["string"],
    "semantic": ["string"]
  },
  "outline": [
    {"heading": "string", "level": "H2|H3", "content": "string", "keywords": ["string"]}
  ],
  "recommendedWordCount": "number",
  "targetAudience": "string",
  "tone": "string",
  "contentGoals": ["string"],
  "internalLinks": [{"anchor": "string", "target": "string"}],
  "externalLinks": [{"anchor": "string", "target": "string"}],
  "callToAction": "string",
  "seoChecklist": ["string"]
}`,
    inputSchema: {
      topic: z.string().min(3).describe('The content topic or subject'),
      format: z
        .enum(['BLOG', 'VIDEO', 'SOCIAL', 'PODCAST', 'INFOGRAPHIC', 'CASE_STUDY', 'WHITEPAPER', 'EMAIL', 'EBOOK'])
        .describe('Content format'),
      targetKeywords: z.array(z.string()).optional().describe('Primary keywords to target'),
      audience: z.string().optional().describe('Target audience description'),
      contentGoals: z.array(z.string()).optional().describe('Goals for this content'),
    },
    outputSchema: {
      title: z.string(),
      slug: z.string(),
      metaDescription: z.string(),
      format: z.string(),
      targetKeywords: z.object({
        primary: z.string(),
        secondary: z.array(z.string()),
        semantic: z.array(z.string()),
      }),
      outline: z.array(
        z.object({
          heading: z.string(),
          level: z.enum(['H1', 'H2', 'H3']),
          content: z.string(),
          keywords: z.array(z.string()),
        })
      ),
      recommendedWordCount: z.number(),
      targetAudience: z.string(),
      tone: z.string(),
      contentGoals: z.array(z.string()),
      internalLinks: z.array(
        z.object({
          anchor: z.string(),
          target: z.string(),
        })
      ),
      externalLinks: z.array(
        z.object({
          anchor: z.string(),
          target: z.string(),
        })
      ),
      callToAction: z.string(),
      seoChecklist: z.array(z.string()),
    },
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 3000,
    requiredTools: ['fetch-strategy', 'fetch-keyword-clusters'],
    contextSources: ['strategy', 'keywordClusters'],
  },
};
