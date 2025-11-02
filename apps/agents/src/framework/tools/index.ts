// =====================================================
// AGENT TOOLS INDEX
// =====================================================

import { AgentTool } from '@pravado/shared-types';
import { dataFetcherTools } from './data-fetcher';
import { documentWriterTools } from './document-writer';
import { contactAnalyzerTools } from './contact-analyzer';

// =====================================================
// ALL TOOLS EXPORT
// =====================================================

export const allAgentTools: AgentTool[] = [
  ...dataFetcherTools,
  ...documentWriterTools,
  ...contactAnalyzerTools,
];

// =====================================================
// RE-EXPORTS
// =====================================================

export * from './data-fetcher';
export * from './document-writer';
export * from './contact-analyzer';
