// =====================================================
// NAVIGATION CONFIGURATION
// Sprint 39 Phase 3.3.1: Role-Aware Defaults System
// =====================================================

import { NavigationItem, UserRole } from '@pravado/types';

/**
 * Complete navigation structure for Pravado platform
 * Items are filtered based on user role and permissions
 */
export const NAVIGATION_CONFIG: NavigationItem[] = [
  // Dashboard
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '🏠',
    href: '/dashboard',
    roles: [
      UserRole.ADMIN,
      UserRole.DEVELOPER,
      UserRole.AGENT,
      UserRole.CAMPAIGN_MANAGER,
      UserRole.CONTENT_CREATOR,
      UserRole.EDITOR,
      UserRole.STRATEGIST,
      UserRole.ANALYST,
      UserRole.ACCOUNT_MANAGER,
      UserRole.CLIENT,
      UserRole.EXECUTIVE,
      UserRole.TEAM_MEMBER,
      UserRole.MEDIA_CONTACT,
      UserRole.GUEST,
    ],
  },

  // Campaigns
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: '📊',
    href: '/campaigns',
    roles: [
      UserRole.ADMIN,
      UserRole.AGENT,
      UserRole.CAMPAIGN_MANAGER,
      UserRole.STRATEGIST,
      UserRole.ACCOUNT_MANAGER,
    ],
    requiredPermission: 'canManageCampaigns',
    children: [
      {
        id: 'campaigns-overview',
        label: 'Overview',
        icon: '📋',
        href: '/campaigns',
        roles: [
          UserRole.ADMIN,
          UserRole.AGENT,
          UserRole.CAMPAIGN_MANAGER,
          UserRole.STRATEGIST,
          UserRole.ACCOUNT_MANAGER,
        ],
      },
      {
        id: 'campaigns-create',
        label: 'Create Campaign',
        icon: '➕',
        href: '/campaigns/create',
        roles: [
          UserRole.ADMIN,
          UserRole.AGENT,
          UserRole.CAMPAIGN_MANAGER,
          UserRole.STRATEGIST,
          UserRole.ACCOUNT_MANAGER,
        ],
      },
      {
        id: 'campaigns-autonomous',
        label: 'Autonomous Campaigns',
        icon: '🤖',
        href: '/campaigns/autonomous',
        roles: [UserRole.ADMIN, UserRole.AGENT, UserRole.CAMPAIGN_MANAGER],
      },
    ],
  },

  // Content
  {
    id: 'content',
    label: 'Content',
    icon: '✍️',
    href: '/content',
    roles: [
      UserRole.ADMIN,
      UserRole.AGENT,
      UserRole.CAMPAIGN_MANAGER,
      UserRole.CONTENT_CREATOR,
      UserRole.EDITOR,
      UserRole.TEAM_MEMBER,
    ],
    requiredPermission: 'canManageContent',
    children: [
      {
        id: 'content-library',
        label: 'Content Library',
        icon: '📚',
        href: '/content',
        roles: [
          UserRole.ADMIN,
          UserRole.AGENT,
          UserRole.CAMPAIGN_MANAGER,
          UserRole.CONTENT_CREATOR,
          UserRole.EDITOR,
          UserRole.TEAM_MEMBER,
        ],
      },
      {
        id: 'content-create',
        label: 'Create Content',
        icon: '➕',
        href: '/content/create',
        roles: [
          UserRole.ADMIN,
          UserRole.AGENT,
          UserRole.CAMPAIGN_MANAGER,
          UserRole.CONTENT_CREATOR,
        ],
      },
    ],
  },

  // Contacts / CRM
  {
    id: 'contacts',
    label: 'Contacts',
    icon: '👥',
    href: '/contacts',
    roles: [
      UserRole.ADMIN,
      UserRole.AGENT,
      UserRole.CAMPAIGN_MANAGER,
      UserRole.STRATEGIST,
      UserRole.ACCOUNT_MANAGER,
    ],
    requiredPermission: 'canManageContacts',
    children: [
      {
        id: 'contacts-overview',
        label: 'All Contacts',
        icon: '📇',
        href: '/contacts',
        roles: [
          UserRole.ADMIN,
          UserRole.AGENT,
          UserRole.CAMPAIGN_MANAGER,
          UserRole.STRATEGIST,
          UserRole.ACCOUNT_MANAGER,
        ],
      },
      {
        id: 'contacts-media',
        label: 'Media Contacts',
        icon: '📰',
        href: '/contacts/media',
        roles: [
          UserRole.ADMIN,
          UserRole.AGENT,
          UserRole.CAMPAIGN_MANAGER,
          UserRole.STRATEGIST,
        ],
      },
      {
        id: 'contacts-leads',
        label: 'Lead Scoring',
        icon: '⭐',
        href: '/contacts/leads',
        roles: [UserRole.ADMIN, UserRole.CAMPAIGN_MANAGER, UserRole.STRATEGIST],
      },
    ],
  },

  // Agents
  {
    id: 'agents',
    label: 'AI Agents',
    icon: '🤖',
    href: '/agents',
    roles: [
      UserRole.ADMIN,
      UserRole.DEVELOPER,
      UserRole.AGENT,
      UserRole.CAMPAIGN_MANAGER,
      UserRole.CONTENT_CREATOR,
      UserRole.STRATEGIST,
      UserRole.ACCOUNT_MANAGER,
    ],
    requiredPermission: 'canExecuteAgents',
    children: [
      {
        id: 'agents-overview',
        label: 'All Agents',
        icon: '🤖',
        href: '/agents',
        roles: [
          UserRole.ADMIN,
          UserRole.DEVELOPER,
          UserRole.AGENT,
          UserRole.CAMPAIGN_MANAGER,
          UserRole.CONTENT_CREATOR,
          UserRole.STRATEGIST,
          UserRole.ACCOUNT_MANAGER,
        ],
      },
      {
        id: 'agents-templates',
        label: 'Agent Templates',
        icon: '📋',
        href: '/agents/templates',
        roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.AGENT],
        requiredPermission: 'canManageAgents',
      },
      {
        id: 'agents-prompts',
        label: 'Prompt Templates',
        icon: '💬',
        href: '/agents/prompts',
        roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.AGENT],
        requiredPermission: 'canManageAgents',
      },
    ],
  },

  // Analytics
  {
    id: 'analytics',
    label: 'Analytics',
    icon: '📈',
    href: '/analytics',
    roles: [
      UserRole.ADMIN,
      UserRole.AGENT,
      UserRole.CAMPAIGN_MANAGER,
      UserRole.CONTENT_CREATOR,
      UserRole.EDITOR,
      UserRole.STRATEGIST,
      UserRole.ANALYST,
      UserRole.ACCOUNT_MANAGER,
      UserRole.CLIENT,
      UserRole.EXECUTIVE,
      UserRole.TEAM_MEMBER,
    ],
    requiredPermission: 'canViewAnalytics',
    children: [
      {
        id: 'analytics-overview',
        label: 'Overview',
        icon: '📊',
        href: '/analytics',
        roles: [
          UserRole.ADMIN,
          UserRole.AGENT,
          UserRole.CAMPAIGN_MANAGER,
          UserRole.STRATEGIST,
          UserRole.ANALYST,
          UserRole.ACCOUNT_MANAGER,
          UserRole.CLIENT,
          UserRole.EXECUTIVE,
        ],
      },
      {
        id: 'analytics-campaigns',
        label: 'Campaign Analytics',
        icon: '📊',
        href: '/analytics/campaigns',
        roles: [
          UserRole.ADMIN,
          UserRole.CAMPAIGN_MANAGER,
          UserRole.STRATEGIST,
          UserRole.ANALYST,
          UserRole.ACCOUNT_MANAGER,
          UserRole.EXECUTIVE,
        ],
      },
      {
        id: 'analytics-competitive',
        label: 'Competitive Intel',
        icon: '🔍',
        href: '/analytics/competitive',
        roles: [UserRole.ADMIN, UserRole.STRATEGIST, UserRole.ANALYST, UserRole.EXECUTIVE],
      },
      {
        id: 'analytics-team',
        label: 'Team Analytics',
        icon: '👥',
        href: '/analytics/team',
        roles: [UserRole.ADMIN, UserRole.ACCOUNT_MANAGER],
        requiredPermission: 'canManageTeam',
      },
    ],
  },

  // Settings
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    href: '/settings',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.ACCOUNT_MANAGER],
    requiredPermission: 'canManageSettings',
    children: [
      {
        id: 'settings-organization',
        label: 'Organization',
        icon: '🏢',
        href: '/settings/organization',
        roles: [UserRole.ADMIN, UserRole.ACCOUNT_MANAGER],
      },
      {
        id: 'settings-team',
        label: 'Team & Roles',
        icon: '👥',
        href: '/settings/team',
        roles: [UserRole.ADMIN, UserRole.ACCOUNT_MANAGER],
        requiredPermission: 'canManageTeam',
      },
      {
        id: 'settings-integrations',
        label: 'Integrations',
        icon: '🔌',
        href: '/settings/integrations',
        roles: [UserRole.ADMIN, UserRole.DEVELOPER],
        requiredPermission: 'canManageIntegrations',
      },
      {
        id: 'settings-billing',
        label: 'Billing',
        icon: '💳',
        href: '/settings/billing',
        roles: [UserRole.ADMIN, UserRole.ACCOUNT_MANAGER],
        requiredPermission: 'canManageBilling',
      },
      {
        id: 'settings-api',
        label: 'API & Webhooks',
        icon: '🔑',
        href: '/settings/api',
        roles: [UserRole.ADMIN, UserRole.DEVELOPER],
        requiredPermission: 'canAccessAPI',
      },
    ],
  },
];

/**
 * Get navigation items for a specific role
 */
export function getNavigationForRole(role: UserRole): NavigationItem[] {
  return NAVIGATION_CONFIG.filter((item) => item.roles.includes(role)).map((item) => {
    // Filter children based on role
    if (item.children) {
      return {
        ...item,
        children: item.children.filter((child) => child.roles.includes(role)),
      };
    }
    return item;
  });
}

/**
 * Get flat list of all navigation paths for a role
 */
export function getNavigationPathsForRole(role: UserRole): string[] {
  const items = getNavigationForRole(role);
  const paths: string[] = [];

  items.forEach((item) => {
    paths.push(item.href);
    if (item.children) {
      item.children.forEach((child) => {
        paths.push(child.href);
      });
    }
  });

  return paths;
}
