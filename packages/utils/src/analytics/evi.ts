// =====================================================
// EVI (EXPOSURE VISIBILITY INDEX) CALCULATION
// Sprint 68 Track E
// =====================================================
// Composite metric for agent performance tracking

/**
 * EVI Score Components
 */
export interface EVIComponents {
  mediaReach: number; // Media coverage reach (0-100)
  engagementRate: number; // Audience engagement (0-100)
  sentimentScore: number; // Sentiment analysis (0-100)
  tierQuality: number; // Quality of media tier (0-100)
}

/**
 * EVI Calculation Result
 */
export interface EVIResult {
  score: number; // Overall EVI score (0-100)
  components: EVIComponents;
  trend: 'up' | 'down' | 'stable';
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Historical EVI Data Point
 */
export interface EVIDataPoint {
  timestamp: Date;
  score: number;
}

/**
 * Calculate EVI score from components
 *
 * Formula: EVI = (0.35 × mediaReach) + (0.25 × engagementRate) + (0.25 × sentimentScore) + (0.15 × tierQuality)
 *
 * Weights:
 * - Media Reach: 35% (coverage breadth)
 * - Engagement Rate: 25% (audience interaction)
 * - Sentiment Score: 25% (positive perception)
 * - Tier Quality: 15% (media authority)
 */
export function calculateEVI(components: EVIComponents): number {
  const weights = {
    mediaReach: 0.35,
    engagementRate: 0.25,
    sentimentScore: 0.25,
    tierQuality: 0.15,
  };

  const score =
    components.mediaReach * weights.mediaReach +
    components.engagementRate * weights.engagementRate +
    components.sentimentScore * weights.sentimentScore +
    components.tierQuality * weights.tierQuality;

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Determine EVI grade based on score
 */
export function getEVIGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Calculate EVI trend from historical data
 */
export function calculateEVITrend(
  history: EVIDataPoint[],
  windowDays: number = 7
): 'up' | 'down' | 'stable' {
  if (history.length < 2) return 'stable';

  // Sort by timestamp descending
  const sorted = [...history].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Get data within window
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);

  const windowData = sorted.filter((point) => point.timestamp >= cutoff);

  if (windowData.length < 2) return 'stable';

  // Calculate average of first half vs second half
  const midpoint = Math.floor(windowData.length / 2);
  const recentHalf = windowData.slice(0, midpoint);
  const earlierHalf = windowData.slice(midpoint);

  const recentAvg = recentHalf.reduce((sum, p) => sum + p.score, 0) / recentHalf.length;
  const earlierAvg = earlierHalf.reduce((sum, p) => sum + p.score, 0) / earlierHalf.length;

  const diff = recentAvg - earlierAvg;

  // Consider trend significant if change > 5 points
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'stable';
}

/**
 * Calculate full EVI result with all metadata
 */
export function calculateEVIResult(
  components: EVIComponents,
  history?: EVIDataPoint[]
): EVIResult {
  const score = calculateEVI(components);
  const grade = getEVIGrade(score);
  const trend = history ? calculateEVITrend(history) : 'stable';

  return {
    score,
    components,
    trend,
    grade,
  };
}

/**
 * Calculate Media Reach component from metrics
 */
export function calculateMediaReach(metrics: {
  impressions?: number;
  coverage?: number;
  maxImpressions?: number;
  maxCoverage?: number;
}): number {
  const { impressions = 0, coverage = 0, maxImpressions = 1000000, maxCoverage = 100 } = metrics;

  // Normalize impressions and coverage to 0-100 scale
  const impressionScore = Math.min(100, (impressions / maxImpressions) * 100);
  const coverageScore = Math.min(100, (coverage / maxCoverage) * 100);

  // Average of both metrics
  return Math.round((impressionScore + coverageScore) / 2);
}

/**
 * Calculate Engagement Rate component from metrics
 */
export function calculateEngagementRate(metrics: {
  interactions?: number;
  impressions?: number;
  clicks?: number;
  shares?: number;
}): number {
  const { interactions = 0, impressions = 1, clicks = 0, shares = 0 } = metrics;

  // Calculate engagement rate as percentage
  const totalEngagement = interactions + clicks + shares;
  const rate = (totalEngagement / impressions) * 100;

  // Cap at 100
  return Math.round(Math.min(100, rate * 10)); // Multiply by 10 to scale up typical low engagement rates
}

/**
 * Calculate Sentiment Score component from sentiment data
 */
export function calculateSentimentScore(sentiments: {
  positive?: number;
  neutral?: number;
  negative?: number;
}): number {
  const { positive = 0, neutral = 0, negative = 0 } = sentiments;
  const total = positive + neutral + negative;

  if (total === 0) return 50; // Neutral baseline

  // Calculate weighted score: positive = +1, neutral = 0, negative = -1
  const weightedSum = positive * 1 + neutral * 0 + negative * -1;
  const normalizedScore = ((weightedSum / total + 1) / 2) * 100; // Map from [-1, 1] to [0, 100]

  return Math.round(normalizedScore);
}

/**
 * Calculate Tier Quality component from media tier distribution
 */
export function calculateTierQuality(tiers: {
  tier1?: number;
  tier2?: number;
  tier3?: number;
  untiered?: number;
}): number {
  const { tier1 = 0, tier2 = 0, tier3 = 0, untiered = 0 } = tiers;
  const total = tier1 + tier2 + tier3 + untiered;

  if (total === 0) return 0;

  // Weighted score: Tier 1 = 100, Tier 2 = 70, Tier 3 = 40, Untiered = 10
  const weightedSum = tier1 * 100 + tier2 * 70 + tier3 * 40 + untiered * 10;
  const score = weightedSum / total;

  return Math.round(score);
}
