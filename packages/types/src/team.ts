export interface Team {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  settings: Record<string, unknown>;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  joinedAt: Date;
  createdBy: string | null;
}

export type CreateTeamInput = Pick<Team, 'name' | 'description' | 'organizationId'> & {
  settings?: Record<string, unknown>;
};

export type UpdateTeamInput = Partial<Pick<Team, 'name' | 'description' | 'settings'>>;

export interface AddTeamMemberInput {
  teamId: string;
  userId: string;
  role?: string;
}
