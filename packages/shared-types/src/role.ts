// =====================================================
// ROLE TYPES
// Sprint 39 Phase 3.3.1: Role-Aware Defaults System
// =====================================================

// =====================================================
// ENUMS
// =====================================================

/**
 * User roles in the Pravado platform
 */
export enum UserRole {
  // System & Admin Roles
  ADMIN = 'admin',
  DEVELOPER = 'developer',

  // Core Team Roles
  AGENT = 'agent',
  CAMPAIGN_MANAGER = 'campaign_manager',
  CONTENT_CREATOR = 'content_creator',
  EDITOR = 'editor',
  STRATEGIST = 'strategist',
  ANALYST = 'analyst',
  ACCOUNT_MANAGER = 'account_manager',

  // Client & External Roles
  CLIENT = 'client',
  EXECUTIVE = 'executive',
  TEAM_MEMBER = 'team_member',

  // Media & PR Roles
  MEDIA_CONTACT = 'media_contact',

  // Limited Access Roles
  GUEST = 'guest',
}

/**
 * Role categories for grouping
 */
export enum RoleCategory {
  SYSTEM = 'system',
  CORE_TEAM = 'core_team',
  CLIENT = 'client',
  MEDIA = 'media',
  LIMITED = 'limited',
}

/**
 * Permission levels
 */
export enum PermissionLevel {
  FULL_ACCESS = 'full_access',
  EDIT = 'edit',
  VIEW = 'view',
  LIMITED = 'limited',
  NONE = 'none',
}

// =====================================================
// INTERFACES
// =====================================================

/**
 * Role configuration
 */
export interface RoleConfig {
  role: UserRole;
  category: RoleCategory;
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultRoute: string;
  permissions: RolePermissions;
}

/**
 * Role permissions
 */
export interface RolePermissions {
  // Core permissions
  canManageCampaigns: boolean;
  canManageContent: boolean;
  canManageContacts: boolean;
  canManageTeam: boolean;
  canManageSettings: boolean;

  // Analytics permissions
  canViewAnalytics: boolean;
  canExportData: boolean;

  // Agent permissions
  canManageAgents: boolean;
  canExecuteAgents: boolean;

  // Advanced permissions
  canManageBilling: boolean;
  canManageIntegrations: boolean;
  canAccessAPI: boolean;
  canManageRoles: boolean;

  // Custom permissions
  customPermissions?: Record<string, boolean>;
}

/**
 * User role context
 */
export interface UserRoleContext {
  userId: string;
  organizationId: string;
  role: UserRole;
  roleConfig: RoleConfig;
  permissions: RolePermissions;
  metadata?: Record<string, any>;
}

/**
 * Navigation item
 */
export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  roles: UserRole[];
  requiredPermission?: keyof RolePermissions;
  badge?: string | number;
  children?: NavigationItem[];
  external?: boolean;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  role: UserRole;
  title: string;
  description: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
}

/**
 * Dashboard widget
 */
export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  order: number;
  config?: Record<string, any>;
}

/**
 * Dashboard layout
 */
export interface DashboardLayout {
  columns: number;
  gap: number;
  responsive: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

// =====================================================
// ROLE CONFIGURATIONS
// =====================================================

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    category: RoleCategory.SYSTEM,
    label: 'Administrator',
    description: 'Full system access and control',
    icon: '👑',
    color: 'red',
    defaultRoute: '/dashboard/admin',
    permissions: {
      canManageCampaigns: true,
      canManageContent: true,
      canManageContacts: true,
      canManageTeam: true,
      canManageSettings: true,
      canViewAnalytics: true,
      canExportData: true,
      canManageAgents: true,
      canExecuteAgents: true,
      canManageBilling: true,
      canManageIntegrations: true,
      canAccessAPI: true,
      canManageRoles: true,
    },
  },
  [UserRole.DEVELOPER]: {
    role: UserRole.DEVELOPER,
    category: RoleCategory.SYSTEM,
    label: 'Developer',
    description: 'Technical access for integrations',
    icon: '💻',
    color: 'blue',
    defaultRoute: '/dashboard/developer',
    permissions: {
      canManageCampaigns: false,
      canManageContent: false,
      canManageContacts: false,
      canManageTeam: false,
      canManageSettings: true,
      canViewAnalytics: true,
      canExportData: true,
      canManageAgents: true,
      canExecuteAgents: true,
      canManageBilling: false,
      canManageIntegrations: true,
      canAccessAPI: true,
      canManageRoles: false,
    },
  },
  [UserRole.AGENT]: {
    role: UserRole.AGENT,
    category: RoleCategory.CORE_TEAM,
    label: 'PR Agent',
    description: 'AI agent management and execution',
    icon: '🤖',
    color: 'purple',
    defaultRoute: '/dashboard/agent',
    permissions: {
      canManageCampaigns: true,
      canManageContent: true,
      canManageContacts: true,
      canManageTeam: false,
      canManageSettings: false,
      canViewAnalytics: true,
      canExportData: true,
      canManageAgents: true,
      canExecuteAgents: true,
      canManageBilling: false,
      canManageIntegrations: false,
      canAccessAPI: false,
      canManageRoles: false,
    },
  },
  [UserRole.CAMPAIGN_MANAGER]: {
    role: UserRole.CAMPAIGN_MANAGER,
    category: RoleCategory.CORE_TEAM,
    label: 'Campaign Manager',
    description: 'Campaign planning and execution',
    icon: '📊',
    color: 'green',
    defaultRoute: '/dashboard/campaign-manager',
    permissions: {
      canManageCampaigns: true,
      canManageContent: true,
      canManageContacts: true,
      canManageTeam: false,
      canManageSettings: false,
      canViewAnalytics: true,
      canExportData: true,
      canManageAgents: false,
      canExecuteAgents: true,
      canManageBilling: false,
      canManageIntegrations: false,
      canAccessAPI: false,
      canManageRoles: false,
    },
  },
  [UserRole.CONTENT_CREATOR]: {
    role: UserRole.CONTENT_CREATOR,
    category: RoleCategory.CORE_TEAM,
    label: 'Content Creator',
    description: 'Content creation and editing',
    icon: '✍️',
    color: 'yellow',
    defaultRoute: '/dashboard/content-creator',
    permissions: {
      canManageCampaigns: false,
      canManageContent: true,
      canManageContacts: false,
      canManageTeam: false,
      canManageSettings: false,
      canViewAnalytics: true,
      canExportData: false,
      canManageAgents: false,
      canExecuteAgents: true,
      canManageBilling: false,
      canManageIntegrations: false,
      canAccessAPI: false,
      canManageRoles: false,
    },
  },
  [UserRole.EDITOR]: {
    role: UserRole.EDITOR,
    category: RoleCategory.CORE_TEAM,
    label: 'Editor',
    description: 'Content review and approval',
    icon: '📝',
    color: 'orange',
    defaultRoute: '/dashboard/editor',
    permissions: {
      canManageCampaigns: false,
      canManageContent: true,
      canManageContacts: false,
      canManageTeam: false,
      canManageSettings: false,
      canViewAnalytics: true,
      canExportData: false,
      canManageAgents: false,
      canExecuteAgents: false,
      canManageBilling: false,
      canManageIntegrations: false,
      canAccessAPI: false,
      canManageRoles: false,
    },
  },
  [UserRole.STRATEGIST]: {
    role: UserRole.STRATEGIST,
    category: RoleCategory.CORE_TEAM,
    label: 'Strategist',
    description: 'Strategic planning and insights',
    icon: '🎯',
    color: 'indigo',
    defaultRoute: '/dashboard/strategist',
    permissions: {
      canManageCampaigns: true,
      canManageContent: false,
      canManageContacts: true,
      canManageTeam: false,
      canManageSettings: false,
      canViewAnalytics: true,
      canExportData: true,
      canManageAgents: false,
      canExecuteAgents: true,
      canManageBilling: false,
      canManageIntegrations: false,
      canAccessAPI: false,
      canManageRoles: false,
    },
  },
  [UserRole.ANALYST]: {
    role: UserRole.ANALYST,
    category: RoleCategory.CORE_TEAM,
    label: 'Analyst',
    description: 'Data analysis and reporting',
    icon: '📈',
    color: 'teal',
    defaultRoute: '/dashboard/analyst',
    permissions: {
      canManageCampaigns: false,
      canManageContent: false,
      canManageContacts: false,
      canManageTeam: false,
      canManageSettings: false,
      canViewAnalytics: true,
      canExportData: true,
      canManageAgents: false,
      canExecuteAgents: false,
      canManageBilling: false,
      canManageIntegrations: false,
      canAccessAPI: false,
      canManageRoles: false,
    },
  },
  [UserRole.ACCOUNT_MANAGER]: {
    role: UserRole.ACCOUNT_MANAGER,
    category: RoleCategory.CORE_TEAM,
    label: 'Account Manager',
    description: 'Client relationship management',
    icon: '🤝',
    color: 'pink',
    defaultRoute: '/dashboard/account-manager',
    permissions: {
      canManageCampaigns: true,
      canManageContent: false,
      canManageContacts: true,
      canManageTeam: false,
      canManageSettings: false,
      canViewAnalytics: true,
      canExportData: true,
      canManageAgents: false,
      canExecuteAgents: true,
      canManageBilling: true,
      canManageIntegrations: false,
      canAccessAPI: false,
      canManageRoles: false,
    },
  },
  [UserRole.CLIENT]: {
    role: UserRole.CLIENT,
    category: RoleCategory.CLIENT,
    label: 'Client',
    description: 'Campaign viewing and feedback',
    icon: '👤',
    color: 'blue',
    defaultRoute: '/dashboard/client',
    permissions: {
      canManageCampaigns: false,
      canManageContent: false,
      canManageContacts: false,
      canManageTeam: false,
      canManageSettings: false,
      canViewAnalytics: true,
      canExportData: false,
      canManageAgents: false,
      canExecuteAgents: false,
      canManageBilling: false,
      canManageIntegrations: false,
      canAccessAPI: false,
      canManageRoles: false,
    },
  },
  [UserRole.EXECUTIVE]: {
    role: UserRole.EXECUTIVE,
    category: RoleCategory.CLIENT,
    label: 'Executive',
    description: 'High-level overview and insights',
    icon: '💼',
    color: 'gray',
    defaultRoute: '/dashboard/executive',
    permissions: {
      canManageCampaigns: false,
      canManageContent: false,
      canManageContacts: false,
      canManageTeam: false,
      canManageSettings: false,
      canViewAnalytics: true,
      canExportData: true,
      canManageAgents: false,
      canExecuteAgents: false,
      canManageBilling: false,
      canManageIntegrations: false,
      canAccessAPI: false,
      canManageRoles: false,
    },
  },
  [UserRole.TEAM_MEMBER]: {
    role: UserRole.TEAM_MEMBER,
    category: RoleCategory.CLIENT,
    label: 'Team Member',
    description: 'Collaborative team access',
    icon: '👥',
    color: 'cyan',
    defaultRoute: '/dashboard/team-member',
    permissions: {
      canManageCampaigns: false,
      canManageContent: true,
      canManageContacts: false,
      canManageTeam: false,
      canManageSettings: false,
      canViewAnalytics: true,
      canExportData: false,
      canManageAgents: false,
      canExecuteAgents: false,
      canManageBilling: false,
      canManageIntegrations: false,
      canAccessAPI: false,
      canManageRoles: false,
    },
  },
  [UserRole.MEDIA_CONTACT]: {
    role: UserRole.MEDIA_CONTACT,
    category: RoleCategory.MEDIA,
    label: 'Media Contact',
    description: 'Media and press access',
    icon: '📰',
    color: 'violet',
    defaultRoute: '/dashboard/media-contact',
    permissions: {
      canManageCampaigns: false,
      canManageContent: false,
      canManageContacts: false,
      canManageTeam: false,
      canManageSettings: false,
      canViewAnalytics: false,
      canExportData: false,
      canManageAgents: false,
      canExecuteAgents: false,
      canManageBilling: false,
      canManageIntegrations: false,
      canAccessAPI: false,
      canManageRoles: false,
    },
  },
  [UserRole.GUEST]: {
    role: UserRole.GUEST,
    category: RoleCategory.LIMITED,
    label: 'Guest',
    description: 'Limited read-only access',
    icon: '👁️',
    color: 'gray',
    defaultRoute: '/dashboard/guest',
    permissions: {
      canManageCampaigns: false,
      canManageContent: false,
      canManageContacts: false,
      canManageTeam: false,
      canManageSettings: false,
      canViewAnalytics: false,
      canExportData: false,
      canManageAgents: false,
      canExecuteAgents: false,
      canManageBilling: false,
      canManageIntegrations: false,
      canAccessAPI: false,
      canManageRoles: false,
    },
  },
};

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * Role detection input
 */
export interface RoleDetectionInput {
  userId?: string;
  organizationId?: string;
  session?: any;
  context?: Record<string, any>;
}

/**
 * Role detection result
 */
export interface RoleDetectionResult {
  role: UserRole;
  roleConfig: RoleConfig;
  permissions: RolePermissions;
  confidence: number;
  source: 'session' | 'database' | 'default' | 'inferred';
}
