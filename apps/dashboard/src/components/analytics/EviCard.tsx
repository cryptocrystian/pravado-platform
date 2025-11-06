'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

interface EVIData {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  trend: 'up' | 'down' | 'stable';
  components: {
    mediaReach: number;
    engagementRate: number;
    sentimentScore: number;
    tierQuality: number;
  };
  history: Array<{
    timestamp: string;
    score: number;
  }>;
}

export function EviCard({ campaignId }: { campaignId?: string }) {
  const { data, isLoading } = useQuery<EVIData>({
    queryKey: ['evi', campaignId],
    queryFn: async () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      const response = await api.get(`/agent-analytics/evi${params}`);
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  if (!data) return null;

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'F': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <span className="text-green-600">↑</span>;
    if (trend === 'down') return <span className="text-red-600">↓</span>;
    return <span className="text-gray-600">→</span>;
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold mb-1">Exposure Visibility Index</h3>
          <p className="text-sm text-gray-600">Composite performance metric</p>
        </div>
        <span className={`text-2xl px-4 py-2 rounded font-bold ${getGradeColor(data.grade)}`}>
          {data.grade}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="text-4xl font-bold">{data.score}</div>
        <div className="text-2xl">{getTrendIcon(data.trend)}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-xs text-gray-600 mb-1">Media Reach</div>
          <div className="text-lg font-semibold">{data.components.mediaReach}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">Engagement</div>
          <div className="text-lg font-semibold">{data.components.engagementRate}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">Sentiment</div>
          <div className="text-lg font-semibold">{data.components.sentimentScore}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">Tier Quality</div>
          <div className="text-lg font-semibold">{data.components.tierQuality}</div>
        </div>
      </div>

      {/* 7-day sparkline */}
      {data.history && data.history.length > 0 && (
        <div className="border-t pt-4">
          <div className="text-xs text-gray-600 mb-2">7-Day Trend</div>
          <div className="flex items-end gap-1 h-16">
            {data.history.slice(-7).map((point, idx) => (
              <div key={idx} className="flex-1 bg-blue-100 hover:bg-blue-200 rounded-t transition-colors" style={{ height: `${point.score}%` }} title={`${point.score} on ${new Date(point.timestamp).toLocaleDateString()}`} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
