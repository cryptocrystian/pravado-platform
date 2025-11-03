-- =====================================================
-- ADMIN ROLE & PERMISSION MANAGEMENT SYSTEM
-- Sprint 60 Phase 5.7
-- =====================================================
-- Purpose: Centralized RBAC system for admin access controls
-- Tables: admin_roles, admin_role_assignments, admin_permissions, role_audit_logs
-- Features: Many-to-many relationships, default roles, audit logging, RLS, 90-day TTL

-- =====================================================
-- TABLE: admin_roles
-- =====================================================
-- Stores role definitions (both system and custom roles)

CREATE TABLE IF NOT EXISTS admin_roles (
  role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for admin_roles
CREATE INDEX idx_admin_roles_role_name ON admin_roles(role_name);
CREATE INDEX idx_admin_roles_is_system ON admin_roles(is_system_role);
CREATE INDEX idx_admin_roles_is_active ON admin_roles(is_active);

-- =====================================================
-- TABLE: admin_permissions
-- =====================================================
-- Defines permissions that can be assigned to roles

CREATE TABLE IF NOT EXISTS admin_permissions (
  permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for admin_permissions
CREATE INDEX idx_admin_permissions_permission_name ON admin_permissions(permission_name);
CREATE INDEX idx_admin_permissions_category ON admin_permissions(category);

-- =====================================================
-- TABLE: admin_role_permissions
-- =====================================================
-- Many-to-many mapping between roles and permissions

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES admin_roles(role_id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES admin_permissions(permission_id) ON DELETE CASCADE,
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Indexes for admin_role_permissions
CREATE INDEX idx_admin_role_permissions_role_id ON admin_role_permissions(role_id);
CREATE INDEX idx_admin_role_permissions_permission_id ON admin_role_permissions(permission_id);

-- =====================================================
-- TABLE: admin_role_assignments
-- =====================================================
-- Assigns roles to users

CREATE TABLE IF NOT EXISTS admin_role_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES admin_roles(role_id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(user_id, role_id)
);

-- Indexes for admin_role_assignments
CREATE INDEX idx_admin_role_assignments_user_id ON admin_role_assignments(user_id);
CREATE INDEX idx_admin_role_assignments_role_id ON admin_role_assignments(role_id);
CREATE INDEX idx_admin_role_assignments_assigned_by ON admin_role_assignments(assigned_by);
CREATE INDEX idx_admin_role_assignments_expires_at ON admin_role_assignments(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_admin_role_assignments_is_active ON admin_role_assignments(is_active);

-- =====================================================
-- TABLE: role_audit_logs
-- =====================================================
-- Audit trail for all role/permission changes

CREATE TABLE IF NOT EXISTS role_audit_logs (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(50) NOT NULL,
  actor_id UUID NOT NULL,
  actor_email VARCHAR(255),
  target_user_id UUID,
  target_role VARCHAR(100),
  permission VARCHAR(100),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

-- Indexes for role_audit_logs
CREATE INDEX idx_role_audit_logs_action_type ON role_audit_logs(action_type);
CREATE INDEX idx_role_audit_logs_actor_id ON role_audit_logs(actor_id);
CREATE INDEX idx_role_audit_logs_target_user_id ON role_audit_logs(target_user_id) WHERE target_user_id IS NOT NULL;
CREATE INDEX idx_role_audit_logs_target_role ON role_audit_logs(target_role) WHERE target_role IS NOT NULL;
CREATE INDEX idx_role_audit_logs_timestamp ON role_audit_logs(timestamp DESC);
CREATE INDEX idx_role_audit_logs_expires_at ON role_audit_logs(expires_at);

-- =====================================================
-- SEED DATA: Default Roles
-- =====================================================

INSERT INTO admin_roles (role_name, display_name, description, is_system_role) VALUES
  ('super_admin', 'Super Administrator', 'Full system access with role and permission management capabilities', TRUE),
  ('admin', 'Administrator', 'Comprehensive administrative access excluding role management', TRUE),
  ('analyst', 'Analyst', 'Analytics, reporting, and data export capabilities', TRUE),
  ('support', 'Support Engineer', 'Support ticket management and troubleshooting access', TRUE),
  ('moderator', 'Moderator', 'Content and user moderation capabilities', TRUE)
ON CONFLICT (role_name) DO NOTHING;

-- =====================================================
-- SEED DATA: Default Permissions
-- =====================================================

INSERT INTO admin_permissions (permission_name, category, description) VALUES
  -- Analytics & Reporting
  ('view_analytics', 'analytics', 'View analytics dashboards and reports'),
  ('export_data', 'analytics', 'Export data to CSV/JSON formats'),
  ('view_performance_metrics', 'analytics', 'View system performance metrics'),
  ('view_error_logs', 'analytics', 'View error logs and diagnostics'),

  -- Moderation
  ('manage_moderation', 'moderation', 'Full moderation management access'),
  ('flag_clients', 'moderation', 'Flag clients for review'),
  ('ban_tokens', 'moderation', 'Ban authentication tokens'),
  ('view_abuse_reports', 'moderation', 'View abuse detection reports'),
  ('configure_thresholds', 'moderation', 'Configure abuse detection thresholds'),

  -- Debug & Trace
  ('view_debug_traces', 'debug', 'View agent execution traces'),
  ('log_traces', 'debug', 'Create new trace logs'),
  ('export_traces', 'debug', 'Export trace data'),

  -- User & Role Management
  ('manage_roles', 'access_control', 'Create, update, and delete roles'),
  ('assign_roles', 'access_control', 'Assign roles to users'),
  ('manage_permissions', 'access_control', 'Grant and revoke permissions'),
  ('view_users', 'access_control', 'View user information'),

  -- Tenant Management
  ('view_tenants', 'tenants', 'View tenant information'),
  ('manage_tenants', 'tenants', 'Create and manage tenants'),

  -- Agent Management
  ('view_agents', 'agents', 'View agent information'),
  ('manage_agents', 'agents', 'Create and manage agents'),
  ('view_agent_activity', 'agents', 'View agent activity logs'),

  -- System Administration
  ('view_audit_logs', 'system', 'View audit trail logs'),
  ('export_audit_logs', 'system', 'Export audit logs'),
  ('manage_system_config', 'system', 'Manage system configuration'),

  -- Support Actions
  ('view_support_tickets', 'support', 'View support tickets'),
  ('respond_to_tickets', 'support', 'Respond to support tickets')
ON CONFLICT (permission_name) DO NOTHING;

-- =====================================================
-- SEED DATA: Default Role-Permission Mappings
-- =====================================================

-- Super Admin: All permissions
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.role_name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin: Most permissions except role/permission management
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.role_name = 'admin'
  AND p.permission_name IN (
    'view_analytics', 'export_data', 'view_performance_metrics', 'view_error_logs',
    'manage_moderation', 'flag_clients', 'ban_tokens', 'view_abuse_reports', 'configure_thresholds',
    'view_debug_traces', 'log_traces', 'export_traces',
    'view_users', 'view_tenants', 'view_agents', 'manage_agents', 'view_agent_activity',
    'view_audit_logs', 'view_support_tickets', 'respond_to_tickets'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Analyst: Analytics and reporting focused
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.role_name = 'analyst'
  AND p.permission_name IN (
    'view_analytics', 'export_data', 'view_performance_metrics', 'view_error_logs',
    'view_agents', 'view_agent_activity', 'view_tenants',
    'view_debug_traces', 'export_traces'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Support: Support and troubleshooting
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.role_name = 'support'
  AND p.permission_name IN (
    'view_analytics', 'view_error_logs', 'view_agents', 'view_agent_activity',
    'view_debug_traces', 'view_support_tickets', 'respond_to_tickets', 'view_abuse_reports'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Moderator: Moderation focused
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.role_name = 'moderator'
  AND p.permission_name IN (
    'manage_moderation', 'flag_clients', 'ban_tokens', 'view_abuse_reports', 'view_audit_logs'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =====================================================
-- FUNCTION: get_user_roles
-- =====================================================
-- Returns all active roles for a user

CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TABLE (
  role_name VARCHAR(100),
  display_name VARCHAR(255),
  assigned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.role_name,
    ar.display_name,
    ara.assigned_at,
    ara.expires_at
  FROM admin_role_assignments ara
  INNER JOIN admin_roles ar ON ara.role_id = ar.role_id
  WHERE ara.user_id = p_user_id
    AND ara.is_active = TRUE
    AND (ara.expires_at IS NULL OR ara.expires_at > NOW())
  ORDER BY ara.assigned_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: get_user_permissions
-- =====================================================
-- Returns all permissions for a user (derived from their roles)

CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (
  permission_name VARCHAR(100),
  granted_by_role VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    ap.permission_name,
    ar.role_name AS granted_by_role
  FROM admin_role_assignments ara
  INNER JOIN admin_roles ar ON ara.role_id = ar.role_id
  INNER JOIN admin_role_permissions arp ON ar.role_id = arp.role_id
  INNER JOIN admin_permissions ap ON arp.permission_id = ap.permission_id
  WHERE ara.user_id = p_user_id
    AND ara.is_active = TRUE
    AND (ara.expires_at IS NULL OR ara.expires_at > NOW())
    AND ar.is_active = TRUE
    AND ap.is_active = TRUE
  ORDER BY ap.permission_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: check_user_permission
-- =====================================================
-- Checks if a user has a specific permission

CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_permission_name VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM admin_role_assignments ara
    INNER JOIN admin_roles ar ON ara.role_id = ar.role_id
    INNER JOIN admin_role_permissions arp ON ar.role_id = arp.role_id
    INNER JOIN admin_permissions ap ON arp.permission_id = ap.permission_id
    WHERE ara.user_id = p_user_id
      AND ap.permission_name = p_permission_name
      AND ara.is_active = TRUE
      AND (ara.expires_at IS NULL OR ara.expires_at > NOW())
      AND ar.is_active = TRUE
      AND ap.is_active = TRUE
  ) INTO has_permission;

  RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: get_role_statistics
-- =====================================================
-- Returns statistics for each role

CREATE OR REPLACE FUNCTION get_role_statistics()
RETURNS TABLE (
  role_name VARCHAR(100),
  display_name VARCHAR(255),
  active_assignments BIGINT,
  total_assignments BIGINT,
  permission_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.role_name,
    ar.display_name,
    COUNT(DISTINCT ara.assignment_id) FILTER (WHERE ara.is_active = TRUE AND (ara.expires_at IS NULL OR ara.expires_at > NOW())) AS active_assignments,
    COUNT(DISTINCT ara.assignment_id) AS total_assignments,
    COUNT(DISTINCT arp.permission_id) AS permission_count
  FROM admin_roles ar
  LEFT JOIN admin_role_assignments ara ON ar.role_id = ara.role_id
  LEFT JOIN admin_role_permissions arp ON ar.role_id = arp.role_id
  WHERE ar.is_active = TRUE
  GROUP BY ar.role_id, ar.role_name, ar.display_name
  ORDER BY ar.role_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: cleanup_expired_role_audit_logs
-- =====================================================
-- Removes audit logs older than 90 days (called by cron job)

CREATE OR REPLACE FUNCTION cleanup_expired_role_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM role_audit_logs
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: cleanup_expired_role_assignments
-- =====================================================
-- Deactivates role assignments that have expired

CREATE OR REPLACE FUNCTION cleanup_expired_role_assignments()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE admin_role_assignments
  SET is_active = FALSE
  WHERE expires_at < NOW()
    AND is_active = TRUE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: update_admin_roles_timestamp
-- =====================================================
-- Updates the updated_at timestamp on admin_roles

CREATE OR REPLACE FUNCTION update_admin_roles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_roles_timestamp
  BEFORE UPDATE ON admin_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_roles_timestamp();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Note: RLS is primarily for tenant-specific data
-- Admin roles are global, but we can still add basic security

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view roles and permissions
CREATE POLICY view_roles ON admin_roles
  FOR SELECT
  USING (TRUE);

CREATE POLICY view_permissions ON admin_permissions
  FOR SELECT
  USING (TRUE);

CREATE POLICY view_role_permissions ON admin_role_permissions
  FOR SELECT
  USING (TRUE);

-- Policy: Users can view their own role assignments
CREATE POLICY view_own_assignments ON admin_role_assignments
  FOR SELECT
  USING (
    user_id = current_setting('app.current_user_id', TRUE)::UUID
    OR current_setting('app.is_admin', TRUE)::BOOLEAN = TRUE
  );

-- Policy: Only admins can view audit logs
CREATE POLICY view_audit_logs ON role_audit_logs
  FOR SELECT
  USING (current_setting('app.is_admin', TRUE)::BOOLEAN = TRUE);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE admin_roles IS 'Stores role definitions for admin access control';
COMMENT ON TABLE admin_permissions IS 'Defines granular permissions for admin actions';
COMMENT ON TABLE admin_role_permissions IS 'Many-to-many mapping between roles and permissions';
COMMENT ON TABLE admin_role_assignments IS 'Assigns roles to users with optional expiration';
COMMENT ON TABLE role_audit_logs IS 'Audit trail for role/permission changes with 90-day TTL';

COMMENT ON FUNCTION get_user_roles(UUID) IS 'Returns all active roles for a user';
COMMENT ON FUNCTION get_user_permissions(UUID) IS 'Returns all permissions for a user (derived from roles)';
COMMENT ON FUNCTION check_user_permission(UUID, VARCHAR) IS 'Checks if a user has a specific permission';
COMMENT ON FUNCTION get_role_statistics() IS 'Returns statistics for each role';
COMMENT ON FUNCTION cleanup_expired_role_audit_logs() IS 'Removes audit logs older than 90 days';
COMMENT ON FUNCTION cleanup_expired_role_assignments() IS 'Deactivates expired role assignments';
