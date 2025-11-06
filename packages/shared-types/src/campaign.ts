import { CampaignGoal } from './goals';

export enum CampaignStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum CampaignType {
  PR = 'PR',
  CONTENT = 'CONTENT',
  SEO = 'SEO',
  INTEGRATED = 'INTEGRATED',
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  type: CampaignType;
  status: CampaignStatus;
  startDate: Date;
  endDate: Date | null;
  budget: number | null;
  organizationId: string;
  ownerId: string;
  goals: CampaignGoal[];
  metrics: CampaignMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignMetrics {
  impressions: number;
  engagements: number;
  conversions: number;
  roi: number | null;
  customMetrics: Record<string, number>;
}

export type CreateCampaignInput = Pick<
  Campaign,
  'name' | 'description' | 'type' | 'startDate' | 'endDate' | 'budget' | 'organizationId' | 'ownerId'
> & {
  goals?: CampaignGoal[];
};

export type UpdateCampaignInput = Partial<
  Pick<Campaign, 'name' | 'description' | 'status' | 'startDate' | 'endDate' | 'budget'>
>;
