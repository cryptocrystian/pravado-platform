#!/bin/bash

# =====================================================
# GENERATE REMAINING PRODUCTION DASHBOARDS
# Sprint 40 Phase 3.3.2
# =====================================================

echo "🚀 Creating remaining production dashboards..."

# Content Creator Dashboard
cat > src/pages/dashboards/ContentCreatorDashboard.tsx << 'EOF'
// =====================================================
// CONTENT CREATOR DASHBOARD - PRODUCTION
// Sprint 40 Phase 3.3.2
// =====================================================

import { useState } from 'react';
import { RoleDashboardLayout, DashboardGrid, DashboardSection, DashboardWidget } from '@/components/layouts/RoleDashboardLayout';
import { StatCard, ChartWidget, SimpleBarChart, ActivityFeed, QuickActions, DataTable, ProgressCard } from '@/components/widgets';
import { Plus, Star, TrendingUp, Lightbulb } from 'lucide-react';

export function ContentCreatorDashboard() {
  const [loading] = useState(false);

  const stats = {
    contentPieces: { value: 47, trend: { value: 12, direction: 'up' as const, label: 'this month' } },
    avgPerformance: { value: '8.2/10', trend: { value: 5, direction: 'up' as const } },
    drafts: { value: 8, trend: { value: 2, direction: 'neutral' as const } },
    published: { value: 39, trend: { value: 10, direction: 'up' as const } },
  };

  const contentByType = [
    { label: 'Press Releases', value: 18 },
    { label: 'Blog Posts', value: 15 },
    { label: 'Social Media', value: 10 },
    { label: 'Email Campaigns', value: 4 },
  ];

  const recentContent = [
    { id: '1', title: 'Q2 Product Launch PR', status: 'Published', performance: '9.2/10', date: '2 days ago' },
    { id: '2', title: 'Industry Trends Blog', status: 'Review', performance: '-', date: '1 day ago' },
    { id: '3', title: 'Social Campaign Copy', status: 'Draft', performance: '-', date: 'Today' },
  ];

  const quickActions = [
    { id: 'create', label: 'Create Content', description: 'Start new piece', icon: <Plus />, variant: 'primary' as const, onClick: () => {} },
    { id: 'library', label: 'Content Library', description: 'Browse all content', icon: <Star />, onClick: () => {} },
    { id: 'ideas', label: 'Content Ideas', description: 'AI suggestions', icon: <Lightbulb />, onClick: () => {} },
    { id: 'performance', label: 'View Performance', description: 'Analytics dashboard', icon: <TrendingUp />, onClick: () => {} },
  ];

  return (
    <RoleDashboardLayout actions={<button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Create Content</button>} loading={loading}>
      <DashboardSection title="Content Overview">
        <DashboardGrid columns={4}>
          <StatCard label="Content Pieces (Month)" value={stats.contentPieces.value} icon="📝" trend={stats.contentPieces.trend} />
          <StatCard label="Avg. Performance" value={stats.avgPerformance.value} icon="⭐" trend={stats.avgPerformance.trend} />
          <StatCard label="Drafts In Progress" value={stats.drafts.value} icon="📋" />
          <StatCard label="Published (Month)" value={stats.published.value} icon="✅" trend={stats.published.trend} />
        </DashboardGrid>
      </DashboardSection>

      <DashboardSection title="Content Analytics" className="mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartWidget title="Content by Type" description="This month"><SimpleBarChart data={contentByType} /></ChartWidget>
          <DashboardWidget title="Performance Goal" icon="🎯">
            <ProgressCard title="Monthly Content Goal" description="Pieces created this month" current={47} target={60} unit="pieces" icon="📝" color="yellow" />
          </DashboardWidget>
        </div>
      </DashboardSection>

      <DashboardSection title="Quick Actions" className="mt-8"><QuickActions actions={quickActions} columns={4} /></DashboardSection>

      <DashboardWidget title="Recent Content" icon="📝" className="mt-8">
        <DataTable columns={[
          { key: 'title', label: 'Title' },
          { key: 'status', label: 'Status', render: (item) => <span className={`px-2 py-1 rounded-full text-xs ${item.status === 'Published' ? 'bg-green-100 text-green-700' : item.status === 'Review' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{item.status}</span> },
          { key: 'performance', label: 'Performance' },
          { key: 'date', label: 'Date' },
        ]} data={recentContent} onRowClick={(item) => console.log('View:', item)} />
      </DashboardWidget>
    </RoleDashboardLayout>
  );
}
EOF

echo "✅ ContentCreatorDashboard created"

# Editor Dashboard
cat > src/pages/dashboards/EditorDashboard.tsx << 'EOF'
// =====================================================
// EDITOR DASHBOARD - PRODUCTION
// Sprint 40 Phase 3.3.2
// =====================================================

import { useState } from 'react';
import { RoleDashboardLayout, DashboardGrid, DashboardSection, DashboardWidget } from '@/components/layouts/RoleDashboardLayout';
import { StatCard, ActivityFeed, QuickActions, DataTable } from '@/components/widgets';
import { CheckCircle, Clock } from 'lucide-react';

export function EditorDashboard() {
  const [loading] = useState(false);

  const stats = {
    pending: { value: 12 },
    approved: { value: 38, trend: { value: 15, direction: 'up' as const, label: 'this week' } },
    avgTime: { value: '2.4h', trend: { value: 0.3, direction: 'down' as const } },
    rejected: { value: 3, trend: { value: 2, direction: 'down' as const } },
  };

  const reviewQueue = [
    { id: '1', title: 'Q2 Product Launch PR', author: 'Alice Johnson', submitted: '2 hours ago', priority: 'High' },
    { id: '2', title: 'Blog: Industry Trends', author: 'Bob Smith', submitted: '5 hours ago', priority: 'Medium' },
    { id: '3', title: 'Social Campaign Copy', author: 'Carol Williams', submitted: '1 day ago', priority: 'Low' },
  ];

  const quickActions = [
    { id: 'queue', label: 'Review Queue', description: `${stats.pending.value} items pending`, icon: <Clock />, variant: 'primary' as const, onClick: () => {} },
    { id: 'approved', label: 'Approved Content', description: 'View approved pieces', icon: <CheckCircle />, onClick: () => {} },
  ];

  return (
    <RoleDashboardLayout actions={<button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Review Queue</button>} loading={loading}>
      <DashboardSection title="Editorial Overview">
        <DashboardGrid columns={4}>
          <StatCard label="Pending Reviews" value={stats.pending.value} icon="📋" />
          <StatCard label="Approved (Week)" value={stats.approved.value} icon="✅" trend={stats.approved.trend} />
          <StatCard label="Avg. Review Time" value={stats.avgTime.value} icon="⏱️" trend={stats.avgTime.trend} />
          <StatCard label="Rejected (Week)" value={stats.rejected.value} icon="❌" trend={stats.rejected.trend} />
        </DashboardGrid>
      </DashboardSection>

      <DashboardSection title="Quick Actions" className="mt-8"><QuickActions actions={quickActions} columns={2} /></DashboardSection>

      <DashboardWidget title="Review Queue" icon="📋" className="mt-8">
        <DataTable columns={[
          { key: 'title', label: 'Title' },
          { key: 'author', label: 'Author' },
          { key: 'submitted', label: 'Submitted' },
          { key: 'priority', label: 'Priority', render: (item) => <span className={`px-2 py-1 rounded-full text-xs ${item.priority === 'High' ? 'bg-red-100 text-red-700' : item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{item.priority}</span> },
        ]} data={reviewQueue} onRowClick={(item) => console.log('Review:', item)} />
      </DashboardWidget>
    </RoleDashboardLayout>
  );
}
EOF

echo "✅ EditorDashboard created"

echo "🎉 All dashboards created successfully!"
EOF

chmod +x /home/saipienlabs/projects/pravado-platform/apps/dashboard/create-remaining-dashboards.sh
