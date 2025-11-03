# UI Verification Checklist

**Platform:** Pravado
**Version:** 1.0.0
**Sprint:** 63 - Platform Access & Runtime Activation
**Last Updated:** 2025-11-03

---

## 📋 Overview

This checklist provides a systematic approach to verifying all user interface components, workflows, and visual elements of the Pravado platform are functioning correctly before production deployment.

**Testing Methodology:**
- Manual UI testing with screenshot documentation
- Verify all 8 admin console tabs
- Test critical user workflows end-to-end
- Validate responsive design across breakpoints
- Check accessibility features

**Screenshot Storage:**
- Save screenshots to: `deployment/screenshots/sprint-63/`
- Naming convention: `{tab-name}_{feature}_{timestamp}.png`
- Example: `overview_dashboard_20251103.png`

---

## ✅ Pre-Test Setup

Before beginning UI verification, ensure:

- [ ] Platform is running locally or on staging environment
- [ ] Super admin account created (email: admin@pravado.com)
- [ ] Super admin role assigned
- [ ] At least one test tenant created
- [ ] At least one test agent registered
- [ ] Sample data populated (conversations, traces, logs)
- [ ] Screenshot directory created: `mkdir -p deployment/screenshots/sprint-63/`

**Environment URLs:**
- Local: http://localhost:3000
- Staging: https://staging.pravado.com
- Production: https://app.pravado.com

---

## 🔐 Phase 1: Authentication & Login

### Login Page

- [ ] **Login form renders correctly**
  - Screenshot: `login_form.png`
  - Email input field visible
  - Password input field visible
  - "Remember me" checkbox
  - "Forgot password?" link
  - "Sign In" button

- [ ] **Branding elements present**
  - Screenshot: `login_branding.png`
  - Pravado logo displayed
  - Platform tagline visible
  - Version number shown (v1.0.0)

- [ ] **Responsive design - Mobile (375px)**
  - Screenshot: `login_mobile.png`
  - Form stacks vertically
  - Buttons full-width
  - Logo scales appropriately

- [ ] **Responsive design - Tablet (768px)**
  - Screenshot: `login_tablet.png`
  - Centered layout
  - Adequate spacing

- [ ] **Error handling**
  - Screenshot: `login_error.png`
  - Invalid credentials show error message
  - Error message is user-friendly
  - No stack traces exposed

- [ ] **Successful login**
  - Screenshot: `login_success.png`
  - Redirects to admin console
  - Loading state shown during authentication
  - Token stored securely

---

## 🎛️ Phase 2: Admin Console - All 8 Tabs

### Tab 1: Overview / Dashboard

- [ ] **Dashboard loads successfully**
  - Screenshot: `overview_dashboard.png`
  - No console errors
  - Page renders within 2 seconds

- [ ] **System status card**
  - Screenshot: `overview_system_status.png`
  - Shows "healthy" status
  - System version displayed (1.0.0)
  - Uptime shown
  - Lockdown status visible

- [ ] **Key metrics cards**
  - Screenshot: `overview_metrics.png`
  - Total tenants count
  - Active agents count
  - API requests today
  - Error rate percentage

- [ ] **Recent activity feed**
  - Screenshot: `overview_activity.png`
  - Shows last 10 system events
  - Timestamps are human-readable
  - Event types color-coded

- [ ] **Quick actions**
  - Screenshot: `overview_quick_actions.png`
  - "Create Tenant" button
  - "Register Agent" button
  - "View Logs" button
  - All buttons functional

---

### Tab 2: Tenant Activity

- [ ] **Tenant list table**
  - Screenshot: `tenant_list.png`
  - Table with tenant_id, name, domain, plan, status
  - Sortable columns
  - Pagination controls

- [ ] **Search and filter**
  - Screenshot: `tenant_search.png`
  - Search by tenant name or domain
  - Filter by plan (free, professional, enterprise)
  - Filter by status (active, suspended, deleted)

- [ ] **Tenant details modal/page**
  - Screenshot: `tenant_details.png`
  - Full tenant information
  - Created/updated timestamps
  - List of agents for tenant
  - API usage statistics

- [ ] **Create new tenant**
  - Screenshot: `tenant_create.png`
  - Form with name, domain, plan fields
  - Validation messages for required fields
  - Success confirmation

- [ ] **Tenant actions**
  - Screenshot: `tenant_actions.png`
  - Suspend tenant
  - Delete tenant (with confirmation)
  - View tenant analytics

---

### Tab 3: Agent Activity

- [ ] **Agent list table**
  - Screenshot: `agent_list.png`
  - Table with agent_id, name, type, tenant, status
  - Sortable columns
  - Pagination controls

- [ ] **Agent type badges**
  - Screenshot: `agent_type_badges.png`
  - Different colors for conversational, task-based, hybrid
  - Visual distinction clear

- [ ] **Agent details**
  - Screenshot: `agent_details.png`
  - Agent configuration shown
  - Personality profile visible
  - Performance metrics displayed

- [ ] **Agent conversation history**
  - Screenshot: `agent_conversations.png`
  - List of conversations
  - Message count
  - Last activity timestamp

- [ ] **Register new agent**
  - Screenshot: `agent_register.png`
  - Form with agent_name, type, personality fields
  - Validation working
  - Success message shown

---

### Tab 4: Error Explorer

- [ ] **Error list table**
  - Screenshot: `error_list.png`
  - Table with timestamp, error type, message, component
  - Color-coded severity (error, warning, info)
  - Pagination

- [ ] **Error filtering**
  - Screenshot: `error_filter.png`
  - Filter by severity
  - Filter by component
  - Date range picker

- [ ] **Error details modal**
  - Screenshot: `error_details.png`
  - Full error message
  - Stack trace (for super_admin only)
  - Related request ID
  - User context

- [ ] **Error charts**
  - Screenshot: `error_charts.png`
  - Error rate over time (line chart)
  - Errors by type (pie chart)
  - Errors by component (bar chart)

- [ ] **Search errors**
  - Screenshot: `error_search.png`
  - Search by error message
  - Search by request ID

---

### Tab 5: Performance Metrics

- [ ] **Performance dashboard**
  - Screenshot: `performance_dashboard.png`
  - Key metrics: avg response time, p95, p99
  - Requests per second
  - Active connections

- [ ] **Response time chart**
  - Screenshot: `performance_response_time.png`
  - Line chart showing response time over last 24h
  - Color-coded thresholds (green < 200ms, yellow < 500ms, red > 500ms)

- [ ] **Endpoint performance table**
  - Screenshot: `performance_endpoints.png`
  - Table with endpoint, avg time, call count, error rate
  - Sortable by any column

- [ ] **Database query performance**
  - Screenshot: `performance_database.png`
  - Slow queries list (> 1s)
  - Query execution count
  - Average duration

- [ ] **Time range selector**
  - Screenshot: `performance_timerange.png`
  - Last hour, 24h, 7d, 30d options
  - Custom date range picker

---

### Tab 6: Moderation Queue

- [ ] **Moderation queue table**
  - Screenshot: `moderation_queue.png`
  - Table with item, content preview, score, status, priority
  - Color-coded priority (high, medium, low)
  - Pagination

- [ ] **Content filtering**
  - Screenshot: `moderation_filter.png`
  - Filter by status (pending, approved, rejected)
  - Filter by category (harassment, hate_speech, violence, etc.)
  - Filter by priority

- [ ] **Content review modal**
  - Screenshot: `moderation_review.png`
  - Full content displayed
  - Abuse detection scores shown
  - Category breakdown visible
  - Action buttons (approve, reject, escalate)

- [ ] **Moderation actions**
  - Screenshot: `moderation_actions.png`
  - Approve content (with reason)
  - Reject content (with reason)
  - Escalate to higher tier
  - Confirmation dialogs shown

- [ ] **Moderation history**
  - Screenshot: `moderation_history.png`
  - Past moderation decisions
  - Moderator name
  - Timestamp and reason

- [ ] **Abuse detection config**
  - Screenshot: `moderation_config.png`
  - Threshold sliders visible
  - Auto-approve, auto-reject, escalation thresholds
  - Save configuration button

---

### Tab 7: Debug Tools

- [ ] **Debug trace list**
  - Screenshot: `debug_trace_list.png`
  - Table with trace_id, timestamp, duration, status
  - Expandable rows
  - Pagination

- [ ] **Trace filtering**
  - Screenshot: `debug_trace_filter.png`
  - Filter by agent_id
  - Filter by status (success, error)
  - Date range picker

- [ ] **Trace details**
  - Screenshot: `debug_trace_details.png`
  - Full execution timeline
  - Step-by-step breakdown
  - Input/output for each step
  - Performance metrics per step

- [ ] **Trace search**
  - Screenshot: `debug_trace_search.png`
  - Search by trace_id
  - Search by agent_id or conversation_id

- [ ] **Trace visualization**
  - Screenshot: `debug_trace_viz.png`
  - Timeline view
  - Waterfall chart showing step durations
  - Color-coded by step type

- [ ] **Error trace highlighting**
  - Screenshot: `debug_trace_error.png`
  - Failed steps highlighted in red
  - Error messages clearly visible
  - Stack trace accessible

---

### Tab 8: Access Controls

- [ ] **Roles list**
  - Screenshot: `access_roles_list.png`
  - Table with role_name, display_name, user count
  - System roles marked distinctly

- [ ] **Role details**
  - Screenshot: `access_role_details.png`
  - List of permissions for role
  - Permission grouped by category
  - Checkboxes for enabling/disabling

- [ ] **Create custom role**
  - Screenshot: `access_role_create.png`
  - Form with role_name, display_name, description
  - Permission selector (checkboxes)
  - Validation working

- [ ] **User role assignments**
  - Screenshot: `access_user_assignments.png`
  - Table with user email, assigned role, assigned_by, date
  - Search users
  - Assign/revoke roles

- [ ] **Audit log viewer**
  - Screenshot: `access_audit_logs.png`
  - Table with timestamp, actor, action, target, IP
  - Filterable by actor, action type
  - Exportable to CSV

- [ ] **Permission matrix**
  - Screenshot: `access_permission_matrix.png`
  - Grid showing roles vs permissions
  - Visual checkmarks for granted permissions
  - Easy to scan

---

## 🧪 Phase 3: Critical Workflows

### Workflow 1: Create Tenant → Register Agent → Send Message

- [ ] **Step 1: Create tenant**
  - Screenshot: `workflow_create_tenant.png`
  - Navigate to Tenant Activity tab
  - Click "Create Tenant" button
  - Fill in form (name, domain, plan)
  - Submit form
  - Success message shown
  - Tenant appears in list

- [ ] **Step 2: Register agent**
  - Screenshot: `workflow_register_agent.png`
  - Navigate to Agent Activity tab
  - Click "Register Agent" button
  - Select tenant from dropdown
  - Fill in agent details
  - Submit form
  - Success message shown
  - Agent appears in list

- [ ] **Step 3: Send test message**
  - Screenshot: `workflow_send_message.png`
  - From Agent Activity, click on agent
  - Click "Test Agent" button
  - Enter test message
  - Submit
  - Response displayed
  - Conversation created

- [ ] **Step 4: View trace**
  - Screenshot: `workflow_view_trace.png`
  - Navigate to Debug Tools tab
  - Find trace for conversation
  - Expand trace details
  - Verify all steps logged

---

### Workflow 2: Moderation Review → Approve → Audit Log

- [ ] **Step 1: Submit content for moderation**
  - Screenshot: `workflow_submit_moderation.png`
  - Create content that triggers moderation
  - Content appears in moderation queue

- [ ] **Step 2: Review content**
  - Screenshot: `workflow_review_content.png`
  - Navigate to Moderation tab
  - Click on pending item
  - Review content and scores

- [ ] **Step 3: Take action**
  - Screenshot: `workflow_moderate_action.png`
  - Click "Approve" or "Reject"
  - Enter reason
  - Submit action

- [ ] **Step 4: Verify audit log**
  - Screenshot: `workflow_verify_audit.png`
  - Navigate to Access Controls → Audit Logs
  - Find moderation action entry
  - Verify actor, action, timestamp logged

---

### Workflow 3: API Key Generation → Test API Call

- [ ] **Step 1: Generate API key**
  - Screenshot: `workflow_generate_key.png`
  - Navigate to tenant details
  - Click "Generate API Key"
  - Enter key name and scopes
  - Submit
  - Key displayed (copy to clipboard)

- [ ] **Step 2: Test API call**
  - Screenshot: `workflow_test_api.png`
  - Open API testing tool (Postman/Insomnia)
  - Make authenticated request with key
  - Verify 200 response

- [ ] **Step 3: View API usage**
  - Screenshot: `workflow_api_usage.png`
  - Navigate to tenant analytics
  - Verify API call logged
  - Usage statistics updated

---

## 📱 Phase 4: Responsive Design

### Desktop (1920px)

- [ ] **Full layout**
  - Screenshot: `responsive_desktop_full.png`
  - All elements visible
  - No horizontal scroll
  - Proper spacing

- [ ] **Sidebar navigation**
  - Screenshot: `responsive_desktop_sidebar.png`
  - Sidebar expanded by default
  - All 8 tabs visible
  - Icons and labels aligned

---

### Laptop (1366px)

- [ ] **Medium layout**
  - Screenshot: `responsive_laptop.png`
  - Content adapts to smaller width
  - Tables still readable
  - Charts resize appropriately

---

### Tablet (768px)

- [ ] **Tablet layout**
  - Screenshot: `responsive_tablet.png`
  - Sidebar collapses to icons only
  - Tables show essential columns only
  - Mobile-friendly navigation

---

### Mobile (375px)

- [ ] **Mobile layout**
  - Screenshot: `responsive_mobile.png`
  - Hamburger menu for navigation
  - Stacked cards instead of tables
  - Touch-friendly buttons (min 44px)

- [ ] **Mobile navigation**
  - Screenshot: `responsive_mobile_nav.png`
  - Drawer opens on menu click
  - All tabs accessible
  - Smooth animations

---

## ♿ Phase 5: Accessibility

### Keyboard Navigation

- [ ] **Tab through all elements**
  - Screenshot: `a11y_keyboard_nav.png`
  - Focus indicator visible
  - Logical tab order
  - No keyboard traps

- [ ] **Form submission via Enter**
  - Forms submit on Enter key
  - Buttons activate on Space/Enter

---

### Screen Reader

- [ ] **ARIA labels present**
  - Screenshot: `a11y_aria.png`
  - Buttons have aria-label
  - Form fields have aria-describedby
  - Icons have aria-hidden

- [ ] **Headings hierarchy**
  - Proper h1, h2, h3 structure
  - No skipped heading levels

---

### Color Contrast

- [ ] **WCAG AA compliance**
  - Screenshot: `a11y_contrast.png`
  - Text on background: 4.5:1 minimum
  - Large text: 3:1 minimum
  - Test with Axe DevTools

---

### Focus States

- [ ] **Visible focus indicators**
  - Screenshot: `a11y_focus.png`
  - All interactive elements have focus style
  - Focus outline clearly visible
  - Custom focus styles used (not default browser)

---

## 🎨 Phase 6: Visual Design

### Branding Consistency

- [ ] **Color palette**
  - Screenshot: `design_colors.png`
  - Primary, secondary, accent colors used consistently
  - Error, warning, success, info colors distinct

- [ ] **Typography**
  - Screenshot: `design_typography.png`
  - Font family consistent (Inter, Roboto, or custom)
  - Font sizes follow scale (12, 14, 16, 20, 24, 32px)
  - Line heights readable (1.5-1.75)

- [ ] **Spacing**
  - Screenshot: `design_spacing.png`
  - Consistent padding/margin (8px grid)
  - Card padding uniform
  - Button padding comfortable

---

### Component Consistency

- [ ] **Buttons**
  - Screenshot: `design_buttons.png`
  - Primary, secondary, tertiary styles
  - Consistent hover states
  - Loading states shown

- [ ] **Forms**
  - Screenshot: `design_forms.png`
  - Input field styles uniform
  - Label positioning consistent
  - Error states clearly marked

- [ ] **Tables**
  - Screenshot: `design_tables.png`
  - Header styling consistent
  - Row hover states
  - Sortable column indicators

- [ ] **Cards**
  - Screenshot: `design_cards.png`
  - Border radius consistent
  - Shadow depth uniform
  - Padding standard

---

## 🔄 Phase 7: Performance

### Load Times

- [ ] **Initial page load**
  - Screenshot: `perf_initial_load.png`
  - First contentful paint < 1.5s
  - Time to interactive < 3s
  - Largest contentful paint < 2.5s

- [ ] **Navigation between tabs**
  - Screenshot: `perf_navigation.png`
  - Tab switch < 200ms
  - No page flicker
  - Loading states shown for data

---

### Data Loading

- [ ] **Large tables**
  - Screenshot: `perf_large_table.png`
  - Pagination working (10, 25, 50, 100 items)
  - Virtualization for 100+ rows
  - Smooth scrolling

- [ ] **Charts and graphs**
  - Screenshot: `perf_charts.png`
  - Charts render within 1s
  - Responsive to window resize
  - No lag when hovering

---

## 🐛 Phase 8: Error Handling

### Network Errors

- [ ] **API timeout**
  - Screenshot: `error_timeout.png`
  - Error message shown
  - Retry button available
  - User can continue working

- [ ] **500 Internal Server Error**
  - Screenshot: `error_500.png`
  - User-friendly error message
  - No stack traces shown
  - Contact support info

- [ ] **403 Forbidden**
  - Screenshot: `error_403.png`
  - "Access denied" message
  - Explanation of insufficient permissions
  - Link to contact admin

---

### Form Validation

- [ ] **Required field errors**
  - Screenshot: `error_required.png`
  - Error shown inline
  - Submit disabled until valid
  - Clear error message

- [ ] **Invalid format errors**
  - Screenshot: `error_format.png`
  - Email, URL, phone validation
  - Error message specific to issue
  - Error clears on correction

---

## ✅ Final Verification

### Pre-Production Checklist

- [ ] All 8 admin console tabs load without errors
- [ ] All critical workflows complete successfully
- [ ] Responsive design works on all breakpoints
- [ ] Keyboard navigation functional
- [ ] Screen reader compatible
- [ ] WCAG AA contrast compliance
- [ ] Load times meet targets
- [ ] Error handling graceful
- [ ] No console errors or warnings
- [ ] All screenshots captured and stored

---

## 📊 Summary

**Total Checkpoints:** 120+
**Completed:** ___ / 120+
**Pass Rate:** ___%

**Issues Found:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Blockers:**
- None / List blockers

**Sign-Off:**
- Tester: _______________________
- Date: _______________________
- Status: ☐ Approved ☐ Needs Fixes ☐ Blocked

---

**Next Steps:**
1. Address any issues found during verification
2. Retest failed checkpoints
3. Update this checklist with final results
4. Proceed to production deployment

---

**Last Updated:** 2025-11-03
**Version:** 1.0.0
**Sprint:** 63
