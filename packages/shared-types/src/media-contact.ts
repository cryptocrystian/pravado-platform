export enum MediaContactTier {
  TIER_1 = 'TIER_1', // Top-tier outlets (NYT, WSJ, etc.)
  TIER_2 = 'TIER_2', // Industry-leading publications
  TIER_3 = 'TIER_3', // Niche and regional outlets
  TIER_4 = 'TIER_4', // Blogs and emerging media
}

export enum MediaContactStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DO_NOT_CONTACT = 'DO_NOT_CONTACT',
}

export interface MediaContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  outlet: string;
  position: string;
  tier: MediaContactTier;
  status: MediaContactStatus;
  beats: string[];
  interests: string[];
  timezone: string | null;
  socialProfiles: SocialProfiles;
  notes: string | null;
  lastContactedAt: Date | null;
  responseRate: number;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialProfiles {
  twitter: string | null;
  linkedin: string | null;
  website: string | null;
}

export interface MediaOutreach {
  id: string;
  mediaContactId: string;
  campaignId: string;
  subject: string;
  message: string;
  sentAt: Date;
  openedAt: Date | null;
  repliedAt: Date | null;
  status: 'SENT' | 'OPENED' | 'REPLIED' | 'BOUNCED';
  agentGenerated: boolean;
  createdAt: Date;
}

export type CreateMediaContactInput = Pick<
  MediaContact,
  'name' | 'email' | 'outlet' | 'position' | 'tier' | 'organizationId'
> & {
  phone?: string;
  beats?: string[];
  interests?: string[];
  timezone?: string;
  socialProfiles?: Partial<SocialProfiles>;
  notes?: string;
};

export type UpdateMediaContactInput = Partial<
  Pick<
    MediaContact,
    'name' | 'email' | 'phone' | 'outlet' | 'position' | 'tier' | 'status' | 'beats' | 'interests' | 'timezone' | 'notes'
  >
> & {
  socialProfiles?: Partial<SocialProfiles>;
};
