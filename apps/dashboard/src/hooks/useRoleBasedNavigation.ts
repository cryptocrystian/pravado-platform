// =====================================================
// ROLE-BASED NAVIGATION HOOK
// Sprint 39 Phase 3.3.1: Role-Aware Defaults System
// =====================================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  NavigationItem,
  UserRole,
  RolePermissions,
  ROLE_CONFIGS,
} from '@pravado/shared-types';
import { NAVIGATION_CONFIG, getNavigationForRole } from '@/config/navigation.config';

/**
 * User context with role information
 */
interface UserContext {
  userId: string;
  organizationId: string;
  role: UserRole;
  permissions: RolePermissions;
}

/**
 * Hook to fetch current user's role and context
 */
export function useUserRole() {
  return useQuery<UserContext>({
    queryKey: ['user-role'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook to get role-based navigation items
 * Filters navigation based on user's role and permissions
 */
export function useRoleBasedNavigation() {
  const { data: userContext, isLoading, error } = useUserRole();

  const navigationItems = useMemo(() => {
    if (!userContext) return [];

    const { role, permissions } = userContext;

    // Get base navigation for role
    const baseNavigation = getNavigationForRole(role);

    // Filter items based on permissions
    return baseNavigation
      .filter((item) => {
        // If item requires a permission, check if user has it
        if (item.requiredPermission) {
          return permissions[item.requiredPermission] === true;
        }
        return true;
      })
      .map((item) => {
        // Filter children based on permissions
        if (item.children) {
          const filteredChildren = item.children.filter((child) => {
            if (child.requiredPermission) {
              return permissions[child.requiredPermission] === true;
            }
            return true;
          });

          return {
            ...item,
            children: filteredChildren.length > 0 ? filteredChildren : undefined,
          };
        }
        return item;
      });
  }, [userContext]);

  return {
    navigationItems,
    userRole: userContext?.role || null,
    permissions: userContext?.permissions || null,
    isLoading,
    error,
  };
}

/**
 * Hook to check if user has permission
 */
export function useHasPermission(permission: keyof RolePermissions): boolean {
  const { data: userContext } = useUserRole();

  if (!userContext) return false;

  return userContext.permissions[permission] === true;
}

/**
 * Hook to check if user has specific role
 */
export function useHasRole(role: UserRole): boolean {
  const { data: userContext } = useUserRole();

  if (!userContext) return false;

  return userContext.role === role;
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useHasAnyRole(roles: UserRole[]): boolean {
  const { data: userContext } = useUserRole();

  if (!userContext) return false;

  return roles.includes(userContext.role);
}

/**
 * Hook to get role configuration
 */
export function useRoleConfig() {
  const { data: userContext } = useUserRole();

  if (!userContext) return null;

  return ROLE_CONFIGS[userContext.role];
}

/**
 * Hook to get default route for current role
 */
export function useDefaultRoute(): string {
  const { data: userContext } = useUserRole();

  if (!userContext) return '/dashboard';

  return ROLE_CONFIGS[userContext.role].defaultRoute;
}

/**
 * Hook to check if user can access a specific path
 */
export function useCanAccessPath(path: string): boolean {
  const { navigationItems } = useRoleBasedNavigation();

  const allPaths: string[] = [];

  navigationItems.forEach((item) => {
    allPaths.push(item.href);
    if (item.children) {
      item.children.forEach((child) => {
        allPaths.push(child.href);
      });
    }
  });

  // Check exact match or prefix match
  return allPaths.some((navPath) => {
    return path === navPath || path.startsWith(navPath + '/');
  });
}

/**
 * Hook to get navigation breadcrumbs for current path
 */
export function useNavigationBreadcrumbs(currentPath: string): NavigationItem[] {
  const { navigationItems } = useRoleBasedNavigation();

  const breadcrumbs: NavigationItem[] = [];

  for (const item of navigationItems) {
    // Check if current path matches this item
    if (currentPath === item.href || currentPath.startsWith(item.href + '/')) {
      breadcrumbs.push(item);

      // Check children
      if (item.children) {
        for (const child of item.children) {
          if (currentPath === child.href || currentPath.startsWith(child.href + '/')) {
            breadcrumbs.push(child);
            break;
          }
        }
      }
      break;
    }
  }

  return breadcrumbs;
}

/**
 * Hook to get navigation items by category (for sidebar grouping)
 */
export function useNavigationByCategory() {
  const { navigationItems, userRole } = useRoleBasedNavigation();

  return useMemo(() => {
    const categories = {
      core: [] as NavigationItem[],
      management: [] as NavigationItem[],
      analytics: [] as NavigationItem[],
      settings: [] as NavigationItem[],
    };

    navigationItems.forEach((item) => {
      switch (item.id) {
        case 'dashboard':
          categories.core.push(item);
          break;
        case 'campaigns':
        case 'content':
        case 'contacts':
        case 'agents':
          categories.management.push(item);
          break;
        case 'analytics':
          categories.analytics.push(item);
          break;
        case 'settings':
          categories.settings.push(item);
          break;
        default:
          categories.core.push(item);
      }
    });

    return categories;
  }, [navigationItems]);
}

/**
 * Hook to get quick actions based on role
 */
export function useQuickActions(): NavigationItem[] {
  const { data: userContext } = useUserRole();

  if (!userContext) return [];

  const { role } = userContext;

  const quickActionsByRole: Record<UserRole, NavigationItem[]> = {
    [UserRole.ADMIN]: [
      { id: 'qa-team', label: 'Manage Team', icon: '👥', href: '/settings/team', roles: [UserRole.ADMIN] },
      { id: 'qa-settings', label: 'Settings', icon: '⚙️', href: '/settings', roles: [UserRole.ADMIN] },
    ],
    [UserRole.DEVELOPER]: [
      { id: 'qa-api', label: 'API Keys', icon: '🔑', href: '/settings/api', roles: [UserRole.DEVELOPER] },
      { id: 'qa-integrations', label: 'Integrations', icon: '🔌', href: '/settings/integrations', roles: [UserRole.DEVELOPER] },
    ],
    [UserRole.AGENT]: [
      { id: 'qa-campaign', label: 'New Campaign', icon: '➕', href: '/campaigns/create', roles: [UserRole.AGENT] },
      { id: 'qa-agents', label: 'Run Agent', icon: '🤖', href: '/agents', roles: [UserRole.AGENT] },
    ],
    [UserRole.CAMPAIGN_MANAGER]: [
      { id: 'qa-campaign', label: 'New Campaign', icon: '➕', href: '/campaigns/create', roles: [UserRole.CAMPAIGN_MANAGER] },
      { id: 'qa-analytics', label: 'View Analytics', icon: '📈', href: '/analytics', roles: [UserRole.CAMPAIGN_MANAGER] },
    ],
    [UserRole.CONTENT_CREATOR]: [
      { id: 'qa-content', label: 'Create Content', icon: '✍️', href: '/content/create', roles: [UserRole.CONTENT_CREATOR] },
      { id: 'qa-library', label: 'Content Library', icon: '📚', href: '/content', roles: [UserRole.CONTENT_CREATOR] },
    ],
    [UserRole.EDITOR]: [
      { id: 'qa-review', label: 'Review Content', icon: '📝', href: '/content', roles: [UserRole.EDITOR] },
    ],
    [UserRole.STRATEGIST]: [
      { id: 'qa-campaign', label: 'New Campaign', icon: '➕', href: '/campaigns/create', roles: [UserRole.STRATEGIST] },
      { id: 'qa-intel', label: 'Competitive Intel', icon: '🔍', href: '/analytics/competitive', roles: [UserRole.STRATEGIST] },
    ],
    [UserRole.ANALYST]: [
      { id: 'qa-analytics', label: 'View Analytics', icon: '📈', href: '/analytics', roles: [UserRole.ANALYST] },
      { id: 'qa-export', label: 'Export Data', icon: '📊', href: '/analytics/export', roles: [UserRole.ANALYST] },
    ],
    [UserRole.ACCOUNT_MANAGER]: [
      { id: 'qa-clients', label: 'Manage Clients', icon: '👥', href: '/contacts', roles: [UserRole.ACCOUNT_MANAGER] },
      { id: 'qa-billing', label: 'Billing', icon: '💳', href: '/settings/billing', roles: [UserRole.ACCOUNT_MANAGER] },
    ],
    [UserRole.CLIENT]: [
      { id: 'qa-campaigns', label: 'My Campaigns', icon: '📊', href: '/campaigns', roles: [UserRole.CLIENT] },
      { id: 'qa-analytics', label: 'View Results', icon: '📈', href: '/analytics', roles: [UserRole.CLIENT] },
    ],
    [UserRole.EXECUTIVE]: [
      { id: 'qa-overview', label: 'Executive View', icon: '💼', href: '/dashboard/executive', roles: [UserRole.EXECUTIVE] },
      { id: 'qa-analytics', label: 'Analytics', icon: '📈', href: '/analytics', roles: [UserRole.EXECUTIVE] },
    ],
    [UserRole.TEAM_MEMBER]: [
      { id: 'qa-content', label: 'View Content', icon: '📚', href: '/content', roles: [UserRole.TEAM_MEMBER] },
      { id: 'qa-analytics', label: 'Analytics', icon: '📈', href: '/analytics', roles: [UserRole.TEAM_MEMBER] },
    ],
    [UserRole.MEDIA_CONTACT]: [
      { id: 'qa-dashboard', label: 'Dashboard', icon: '🏠', href: '/dashboard', roles: [UserRole.MEDIA_CONTACT] },
    ],
    [UserRole.GUEST]: [
      { id: 'qa-dashboard', label: 'Dashboard', icon: '🏠', href: '/dashboard', roles: [UserRole.GUEST] },
    ],
  };

  return quickActionsByRole[role] || [];
}
