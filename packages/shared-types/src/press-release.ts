import { ContentStatus } from './content';

export interface PressRelease {
  id: string;
  title: string;
  subtitle: string | null;
  body: string;
  status: ContentStatus;
  campaignId: string | null;
  contactList: string[];
  embargoUntil: Date | null;
  publishedAt: Date | null;
  distributionChannels: string[];
  metadata: Record<string, unknown>;
  organizationId: string;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type CreatePressReleaseInput = Pick<
  PressRelease,
  'title' | 'body' | 'organizationId'
> & {
  subtitle?: string;
  campaignId?: string;
  contactList?: string[];
  embargoUntil?: Date;
  distributionChannels?: string[];
  metadata?: Record<string, unknown>;
};

export type UpdatePressReleaseInput = Partial<
  Pick<
    PressRelease,
    | 'title'
    | 'subtitle'
    | 'body'
    | 'status'
    | 'contactList'
    | 'embargoUntil'
    | 'distributionChannels'
    | 'metadata'
  >
>;
