export enum KeywordDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  VERY_HARD = 'VERY_HARD',
}

export enum KeywordIntent {
  INFORMATIONAL = 'INFORMATIONAL',
  NAVIGATIONAL = 'NAVIGATIONAL',
  TRANSACTIONAL = 'TRANSACTIONAL',
  COMMERCIAL = 'COMMERCIAL',
}

export interface Keyword {
  id: string;
  keyword: string;
  searchVolume: number;
  difficulty: KeywordDifficulty;
  intent: KeywordIntent;
  cpc: number | null;
  competitionScore: number;
  clusterId: string | null;
  organizationId: string;
  metadata: KeywordMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface KeywordMetadata {
  relatedKeywords: string[];
  trendData: TrendDataPoint[];
  serpFeatures: string[];
  seasonality: SeasonalityData | null;
}

export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface SeasonalityData {
  pattern: 'SEASONAL' | 'EVERGREEN' | 'TRENDING';
  peakMonths: number[];
}

export interface KeywordCluster {
  id: string;
  name: string;
  primaryKeyword: string;
  keywords: string[];
  totalSearchVolume: number;
  averageDifficulty: KeywordDifficulty;
  contentGaps: ContentGap[];
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentGap {
  topic: string;
  estimatedTraffic: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export type CreateKeywordInput = Pick<
  Keyword,
  'keyword' | 'searchVolume' | 'difficulty' | 'intent' | 'organizationId'
> & {
  cpc?: number;
  competitionScore?: number;
  clusterId?: string;
  metadata?: Partial<KeywordMetadata>;
};

export type CreateKeywordClusterInput = Pick<
  KeywordCluster,
  'name' | 'primaryKeyword' | 'keywords' | 'organizationId'
> & {
  contentGaps?: ContentGap[];
};
