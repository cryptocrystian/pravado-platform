# Sprint 47 Phase 4.3: Conversational Analytics Dashboard

## Overview

Sprint 47 Phase 4.3 implements a comprehensive analytics dashboard for monitoring agent-user conversations, tracking engagement metrics, sentiment trends, topic distribution, and resolution outcomes. This builds on the messaging infrastructure from Sprints 45 (backend) and 46 (frontend).

### Key Features

- **Conversation Summary**: Total conversations, message volume, response times
- **Sentiment Trends**: Time-series sentiment analysis with daily/weekly/monthly views
- **Topic Distribution**: Most discussed topics extracted from message metadata
- **Engagement Metrics**: Response latency, message ratios, peak activity hours
- **Resolution Outcomes**: Resolved, escalated, abandoned, and in-progress breakdowns
- **Date Range Filtering**: 7-day, 30-day, 90-day, and custom ranges
- **Interactive Charts**: Built with Recharts for beautiful visualizations
- **Real-time Updates**: Configurable refetch intervals for live data

## Architecture

```
┌─────────────────────────────────────────┐
│   AgentAnalyticsDashboard (Page)        │
│   - Date range controls                 │
│   - Chart grid layout                   │
│   - Export/alert actions                │
└────────────┬────────────────────────────┘
             │
       ┌─────┴─────┬──────────────┬──────────┐
       │           │              │          │
┌──────▼──────┐  ┌─▼─────────┐  ┌▼──────┐  ┌▼──────┐
│  Summary    │  │ Sentiment │  │ Topics │  │Engage-│
│   Card      │  │  Chart    │  │ Chart  │  │ ment  │
└──────┬──────┘  └─┬─────────┘  └┬───────┘  └┬──────┘
       │           │              │           │
       └───────────┴──────────────┴───────────┘
                         │
              ┌──────────▼───────────┐
              │   React Query Hooks  │
              │ useAgentAnalytics.ts │
              └──────────┬───────────┘
                         │
              ┌──────────▼───────────┐
              │   Backend API        │
              │ agent-analytics.ts   │
              └──────────┬───────────┘
                         │
              ┌──────────▼───────────┐
              │   Analytics Service  │
              │agentConversationAna- │
              │     lytics.ts        │
              └──────────┬───────────┘
                         │
              ┌──────────▼───────────┐
              │   PostgreSQL DB      │
              │ (Sprint 45 tables)   │
              └──────────────────────┘
```

## Components

### Backend Service (`agentConversationAnalytics.ts`)

Core analytics service with 5 main methods:

#### 1. getConversationSummary()

```typescript
const summary = await agentConversationAnalytics.getConversationSummary(
  agentId,
  { startDate, endDate },
  organizationId
);

// Returns:
{
  totalConversations: 156,
  totalMessages: 2340,
  avgMessagesPerConversation: 15,
  avgConversationLength: 12.5, // minutes
  avgResponseTime: 1200, // milliseconds
  activeConversations: 42,
  completedConversations: 98,
  dateRange: { startDate, endDate }
}
```

#### 2. getSentimentTrends()

```typescript
const trends = await agentConversationAnalytics.getSentimentTrends(
  agentId,
  'daily', // or 'weekly', 'monthly'
  { startDate, endDate },
  organizationId
);

// Returns array of:
[
  {
    date: '2025-11-01',
    positive: 45,
    neutral: 30,
    negative: 8,
    mixed: 3,
    total: 86
  },
  // ...more data points
]
```

#### 3. getTopicDistribution()

```typescript
const topics = await agentConversationAnalytics.getTopicDistribution(
  agentId,
  { startDate, endDate },
  20, // limit
  organizationId
);

// Returns:
[
  {
    topic: 'PR strategy',
    count: 142,
    percentage: 18.5,
    sentiment: { positive: 98, neutral: 32, negative: 12 }
  },
  // ...more topics
]
```

#### 4. getEngagementMetrics()

```typescript
const metrics = await agentConversationAnalytics.getEngagementMetrics(
  agentId,
  { startDate, endDate },
  organizationId
);

// Returns:
{
  avgAgentResponseTime: 1200, // ms
  avgUserResponseTime: 45000, // ms
  avgMessagesPerConversation: 15,
  agentUserMessageRatio: 1.2,
  avgTypingTime: 360, // ms
  peakActivityHours: [
    { hour: 14, messageCount: 245 },
    { hour: 10, messageCount: 198 },
    // ...
  ]
}
```

#### 5. getResolutionOutcomes()

```typescript
const outcomes = await agentConversationAnalytics.getResolutionOutcomes(
  agentId,
  { startDate, endDate },
  organizationId
);

// Returns:
{
  resolved: 98,
  escalated: 12,
  abandoned: 8,
  inProgress: 42,
  total: 160,
  resolutionRate: 61.25, // percentage
  avgTimeToResolution: 24.5 // minutes
}
```

### API Routes (`agent-analytics.ts`)

5 main endpoints + health check:

- **GET /api/agent-analytics/summary/:agentId** - Conversation summary
- **GET /api/agent-analytics/sentiment/:agentId** - Sentiment trends
- **GET /api/agent-analytics/topics/:agentId** - Topic distribution
- **GET /api/agent-analytics/engagement/:agentId** - Engagement metrics
- **GET /api/agent-analytics/resolution/:agentId** - Resolution outcomes
- **GET /api/agent-analytics/health** - Health check

All endpoints support query parameters:
- `startDate` - ISO date string
- `endDate` - ISO date string
- `interval` - 'daily' | 'weekly' | 'monthly' (sentiment only)
- `limit` - Number (topics only)

### React Hooks (`useAgentAnalytics.ts`)

5 hooks matching the backend endpoints:

```typescript
import {
  useConversationSummary,
  useSentimentTrends,
  useTopicDistribution,
  useEngagementMetrics,
  useResolutionOutcomes,
} from '../hooks/useAgentAnalytics';

function MyComponent({ agentId }) {
  const dateRange = {
    startDate: new Date('2025-10-01'),
    endDate: new Date('2025-11-01'),
  };

  const { data: summary, isLoading } = useConversationSummary(
    agentId,
    dateRange
  );

  const { data: sentiment } = useSentimentTrends(
    agentId,
    'daily',
    dateRange
  );

  const { data: topics } = useTopicDistribution(
    agentId,
    dateRange,
    20 // limit
  );

  const { data: engagement } = useEngagementMetrics(agentId, dateRange);

  const { data: resolution } = useResolutionOutcomes(agentId, dateRange);

  // ... use data
}
```

All hooks support options:
- `enabled` - Enable/disable query
- `refetchInterval` - Auto-refetch interval in ms

### Analytics Components (`AnalyticsComponents.tsx`)

5 visualization components:

#### ConversationSummaryCard

Displays key metrics in a card layout:
- Total conversations
- Total messages
- Avg response time
- Avg conversation length
- Active vs completed counts

```typescript
<ConversationSummaryCard
  summary={summary}
  isLoading={isLoading}
/>
```

#### SentimentTrendChart

Stacked area chart showing sentiment over time:
- Positive (green)
- Neutral (gray)
- Negative (red)
- Mixed (orange)

```typescript
<SentimentTrendChart
  data={sentimentTrends}
  isLoading={isLoading}
/>
```

#### TopicDistributionChart

Horizontal bar chart with topic list:
- Shows count and percentage
- Displays top topics
- Includes sentiment breakdown

```typescript
<TopicDistributionChart
  data={topics}
  isLoading={isLoading}
/>
```

#### EngagementMetricsCard

Metrics cards with icons:
- Agent response time
- User response time
- Message ratio
- Typing time
- Peak activity hours

```typescript
<EngagementMetricsCard
  metrics={engagement}
  isLoading={isLoading}
/>
```

#### ResolutionBreakdownCard

Pie chart with breakdown:
- Resolved (green)
- Escalated (red)
- Abandoned (gray)
- In Progress (blue)
- Resolution rate percentage

```typescript
<ResolutionBreakdownCard
  outcomes={resolution}
  isLoading={isLoading}
/>
```

### Dashboard Page (`AgentAnalyticsDashboard.tsx`)

Main dashboard combining all components:

```typescript
import { AgentAnalyticsDashboard } from './pages/agent-analytics';

// Route-based
<Route path="/analytics/:agentId" element={<AgentAnalyticsDashboard />} />

// Prop-based
<AgentAnalyticsDashboard agentId="agent-123" />
```

Features:
- Date range selector (7d, 30d, 90d)
- Sentiment interval selector (daily, weekly, monthly)
- Grid layout for charts
- Export/alert buttons (placeholders)
- Loading states
- Empty states

## Setup

### 1. Install Dependencies

```bash
cd apps/dashboard
npm install recharts
```

### 2. Add Routes

```typescript
// apps/dashboard/src/routes.tsx
import { AgentAnalyticsDashboard } from './pages/agent-analytics';

const routes = [
  {
    path: '/analytics/:agentId',
    element: <AgentAnalyticsDashboard />,
  },
];
```

### 3. Verify Installation

```bash
cd apps/api
node verify-sprint47-phase4.3.js
```

Expected: `✓ All checks passed! (114/115)`

## Usage Examples

### Example 1: Basic Dashboard

```typescript
import { AgentAnalyticsDashboard } from '../pages/agent-analytics';

export default function AnalyticsPage() {
  return (
    <div className="h-screen">
      <AgentAnalyticsDashboard agentId="agent-123" />
    </div>
  );
}
```

### Example 2: Custom Date Range

```typescript
import { useState } from 'react';
import { useConversationSummary } from '../hooks/useAgentAnalytics';

function CustomAnalytics({ agentId }) {
  const [dateRange, setDateRange] = useState({
    startDate: new Date('2025-10-01'),
    endDate: new Date('2025-10-31'),
  });

  const { data: summary } = useConversationSummary(agentId, dateRange);

  return (
    <div>
      <h2>October Analytics</h2>
      <p>Total: {summary?.totalConversations}</p>
    </div>
  );
}
```

### Example 3: Real-time Dashboard

```typescript
import { useConversationSummary } from '../hooks/useAgentAnalytics';

function LiveDashboard({ agentId }) {
  // Refetch every 30 seconds
  const { data } = useConversationSummary(agentId, undefined, {
    refetchInterval: 30000,
  });

  return <ConversationSummaryCard summary={data} />;
}
```

## Development Notes

### Data Sources

Analytics queries the database tables from Sprint 45:
- `agent_conversations` - Conversation metadata
- `agent_messages` - Individual messages
- `user_agent_turns` - Turn tracking
- Message metadata fields: `sentiment`, `topics`, `entities`

### Performance Optimization

**Database Queries**:
- Use indexes from Sprint 45 migration
- Aggregate queries with proper GROUP BY
- Limit result sets with LIMIT clauses
- Use EXPLAIN ANALYZE for slow queries

**Caching**:
- Summary: 30 seconds stale time
- Trends: 1 minute stale time
- React Query automatic cache management

**Chart Rendering**:
- Recharts uses canvas for performance
- ResponsiveContainer for lazy sizing
- Limit data points (e.g., max 90 days for daily)

### Customization

**Add New Metrics**:

1. Add method to analytics service
2. Create API endpoint
3. Create React hook
4. Add to dashboard

**Custom Charts**:

Recharts supports:
- LineChart, AreaChart, BarChart
- PieChart, RadarChart, ScatterChart
- ComposedChart for mixed types

## Testing

```bash
# Backend unit tests
npm test -- agentConversationAnalytics.test.ts

# Frontend component tests
npm test -- AnalyticsComponents.test.tsx

# Integration tests
npm test -- agent-analytics.routes.test.ts
```

## Troubleshooting

**No data showing**:
- Verify agent has conversations with messages
- Check date range includes conversation dates
- Ensure metadata fields populated
- Check browser console for errors

**Slow queries**:
- Review database indexes
- Reduce date range
- Increase stale time
- Use pagination for large datasets

**Charts not rendering**:
- Verify recharts installed
- Check data format matches chart expectations
- Ensure ResponsiveContainer has height
- Check browser console for errors

## Future Enhancements

### Phase 4.4: Advanced Analytics
- Conversation flow analysis
- Intent classification trends
- Multi-agent comparisons
- Predictive metrics

### Phase 4.5: Reporting
- Scheduled reports
- PDF export
- CSV export
- Email alerts

### Phase 4.6: Real-time Dashboards
- WebSocket updates
- Live activity feed
- Real-time alerts
- Streaming metrics

## References

- Sprint 45 Phase 4.1: Backend API
- Sprint 46 Phase 4.2: Frontend UI
- Recharts Documentation: https://recharts.org/
- React Query: https://tanstack.com/query/latest
