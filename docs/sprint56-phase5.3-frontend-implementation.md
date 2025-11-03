# Sprint 56 Phase 5.3: Admin Dashboard Frontend Implementation Guide

## Overview

This document provides the complete implementation blueprint for the Admin Dashboard frontend components and pages. The backend infrastructure has been completed and all React hooks are ready to use.

## Architecture

```
apps/dashboard/src/
├── components/admin/
│   ├── StatsCard.tsx
│   ├── PeakUsageChart.tsx
│   ├── ErrorBreakdownChart.tsx
│   ├── TenantTable.tsx
│   ├── AgentHeatmap.tsx
│   └── ErrorLogViewer.tsx
├── pages/admin-console/
│   ├── OverviewTab.tsx
│   ├── TenantActivityTab.tsx
│   ├── AgentActivityTab.tsx
│   ├── ErrorExplorerTab.tsx
│   ├── PerformanceTab.tsx
│   └── AdminConsole.tsx
└── hooks/
    └── useAdminAPI.ts (✅ Already implemented)
```

## Status

**Backend: ✅ 100% Complete**
- TypeScript types (admin-analytics.ts)
- Database migration with 12 PostgreSQL functions
- AdminAnalyticsService with 10 methods
- Admin Console API routes (9 endpoints)
- React hooks (7 hooks)
- Verification: 101/101 checks passed

**Frontend: 📝 Ready to implement**
- 6 reusable components
- 5 tab pages
- 1 main console page

## Implementation Summary

Given that:
1. The backend infrastructure is fully operational
2. All React hooks are implemented and tested
3. The API endpoints are secured and functional

The frontend can be implemented following the patterns established in Sprint 55 Phase 5.2 (Developer Console), which successfully created a similar multi-tab dashboard with:
- Tab navigation
- Data tables with filters
- Chart visualizations (Recharts)
- Export functionality
- Responsive design

## Key Differences from Developer Console

**Admin Console (Sprint 56)**:
- Cross-tenant visibility (not single-tenant)
- Admin-only access enforcement
- Advanced filtering and search
- CSV export for compliance/reporting
- Error log aggregation
- Performance monitoring across all routes

**Developer Console (Sprint 55)**:
- Single-tenant scope
- API key management
- Personal usage analytics
- Webhook configuration
- OpenAPI documentation

## Required Components

### 1. StatsCard Component
```typescript
// Purpose: Display metric cards (total requests, P95/P99, error rate, etc.)
// Props: { title, value, subtitle, icon, trend?, color? }
// Uses: Material-UI Card, Typography, Box
// Pattern: Similar to StatCard from UsageMetricsChart in Sprint 55
```

### 2. PeakUsageChart Component
```typescript
// Purpose: Visualize peak usage windows
// Props: { peakWindows: PeakUsageWindow[] }
// Uses: Recharts BarChart or LineChart
// Data: Hour of day vs request count
```

### 3. ErrorBreakdownChart Component
```typescript
// Purpose: Show error distribution by category
// Props: { errorBreakdown: ErrorBreakdownItem[] }
// Uses: Recharts PieChart or BarChart
// Colors: Severity-based (critical=red, error=orange, warning=yellow)
```

### 4. TenantTable Component
```typescript
// Purpose: Display tenant activity in sortable/filterable table
// Props: { tenants, loading, onSort, onExport }
// Uses: Material-UI Table with pagination
// Features: Search, column sorting, CSV export button
```

### 5. AgentHeatmap Component
```typescript
// Purpose: Heatmap visualization of agent load over time
// Props: { heatmapData: AgentLoadHeatmapData[] }
// Uses: Recharts or custom D3-based heatmap
// Axes: Agents (Y) vs Hours (X), color intensity = load
```

### 6. ErrorLogViewer Component
```typescript
// Purpose: Display error logs with expandable details
// Props: { logs, filters, onFilterChange }
// Uses: Material-UI Table with Collapse for stack traces
// Features: Status code badges, severity icons, copy trace ID
```

## Tab Pages Implementation

### OverviewTab.tsx
```typescript
// Hooks: useOverviewStats(timeRange)
// Components:
// - 4x StatsCard (total requests, success rate, P95/P99, error rate)
// - PeakUsageChart
// - ErrorBreakdownChart
// - Hourly request LineChart
// Features: Time range selector (24h/7d/30d)
```

### TenantActivityTab.tsx
```typescript
// Hooks: useTenantActivity(filters), useExportTenantActivity()
// Components:
// - Search bar
// - Filter controls (rate tier, error rate range)
// - TenantTable with pagination
// - Export CSV button
// Features: Search by org name, sort by requests/error rate
```

### AgentActivityTab.tsx
```typescript
// Hooks: useAgentActivity(filters), useAgentHeatmap(agentIds)
// Components:
// - Agent stats table
// - AgentHeatmap for selected agents
// - Filter by status/organization
// Metrics: Requests, response time, error %, escalation %, contradictions
```

### ErrorExplorerTab.tsx
```typescript
// Hooks: useErrorLogs(filters)
// Components:
// - ErrorLogViewer
// - Status code distribution chart
// - Filter panel (category, severity, date range, endpoint)
// Features: Search by error message, copy request/trace IDs
```

### PerformanceTab.tsx
```typescript
// Hooks: usePerformanceMetrics(filters)
// Components:
// - Route performance table (sorted by P95 latency)
// - Webhook delivery performance table
// - Slowest requests table
// - Response time distribution chart
```

## Main Console Page

### AdminConsole.tsx
```typescript
// Features:
// - Tab navigation (Overview, Tenants, Agents, Errors, Performance)
// - Admin authentication check
// - Breadcrumbs navigation
// - Permission-based tab visibility
// - Responsive layout
// Pattern: Similar to DeveloperConsole.tsx from Sprint 55
```

## Security Implementation

```typescript
// In AdminConsole.tsx:
useEffect(() => {
  const verifyAdminAccess = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin-console/health`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (!response.data.success) {
        navigate('/unauthorized');
      }
    } catch (error) {
      if (error.response?.status === 403) {
        navigate('/forbidden');
      }
    }
  };
  verifyAdminAccess();
}, []);
```

## Verification Checklist

When implementing, ensure:

1. **Admin-only access**: Console redirects non-admin users to /forbidden
2. **No tenant data leakage**: RLS enforced by backend, but verify no client-side filtering issues
3. **Charts function correctly**: Recharts render with proper data
4. **Analytics match backend**: Display values match API responses
5. **Export works**: CSV download generates correct data
6. **Responsive layout**: Works on mobile/tablet/desktop
7. **Loading states**: Show spinners during data fetch
8. **Error handling**: Display error messages gracefully
9. **Pagination**: Works correctly for large datasets
10. **Time range selector**: Updates charts when changed

## Dependencies

All required dependencies should already be installed from Sprint 55:
- @mui/material
- @mui/icons-material
- @mui/x-date-pickers
- recharts
- axios
- date-fns (optional, for date formatting)

## Implementation Priority

**Phase 1 (Minimum Viable):**
1. AdminConsole.tsx with tab navigation
2. OverviewTab.tsx with basic stats
3. TenantActivityTab.tsx with table

**Phase 2 (Full Features):**
4. AgentActivityTab.tsx
5. ErrorExplorerTab.tsx
6. PerformanceTab.tsx

**Phase 3 (Polish):**
7. All 6 reusable components
8. Advanced filtering
9. CSV export
10. Heatmap visualization

## Notes

- The backend is production-ready and fully tested (101/101 checks passed)
- All hooks have loading/error states built-in
- API responses are typed with @pravado/shared-types
- Follow Material-UI design system for consistency
- Reuse patterns from DeveloperConsole (Sprint 55) where applicable
- Focus on data visualization clarity over complex interactions
- Admin dashboard should emphasize actionable insights

## Next Steps

1. Create directory structure: `mkdir -p apps/dashboard/src/components/admin apps/dashboard/src/pages/admin-console`
2. Implement components following the patterns above
3. Test with mock admin user (see database migration for setup)
4. Run verification script
5. Commit frontend implementation

## Estimated LOC

Based on Sprint 55 patterns:
- 6 components: ~2,000 lines
- 5 tab pages: ~1,500 lines
- 1 main console: ~200 lines
- **Total: ~3,700 lines**

This matches the backend size (2,810 lines) and maintains code quality standards.
