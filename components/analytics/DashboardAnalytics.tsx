'use client';

import { Suspense, memo } from 'react';
import { Card } from '@/components/ui/Card';
import { Building2, Users, Clock, TrendingUp } from 'lucide-react';
import { useApi } from '@/lib/hooks/useApi';
import dynamic from 'next/dynamic';

// Lazy load heavy chart components
const BuildingChart = dynamic(() => import('./BuildingChart').then(mod => ({ default: mod.BuildingChart })), {
  loading: () => <div className="h-[220px] animate-pulse bg-gray-200 rounded" />,
  ssr: false,
});

const TopSubmitters = dynamic(() => import('./TopSubmitters').then(mod => ({ default: mod.TopSubmitters })), {
  loading: () => <div className="h-32 animate-pulse bg-gray-200 rounded" />,
  ssr: false,
});

const UrgencyStatusChart = dynamic(() => import('./UrgencyStatusChart').then(mod => ({ default: mod.UrgencyStatusChart })), {
  loading: () => <div className="h-[180px] animate-pulse bg-gray-200 rounded" />,
  ssr: false,
});

interface AnalyticsData {
  buildingCounts: Record<string, number>;
  topSubmitters: Array<{ name: string; count: number }>;
  urgencyCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  totalTickets: number;
  avgResolutionHours: number;
  resolvedCount: number;
}

export const DashboardAnalytics = memo(function DashboardAnalytics() {
  const { data: analytics, loading, error } = useApi<AnalyticsData>('/api/analytics/tickets', {
    cacheTime: 5 * 60 * 1000, // 5 minutes
    staleTime: 30 * 1000, // 30 seconds
    retries: 3,
    retryDelay: 1000,
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-3">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <Card key={i} className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
                <div className="h-48 bg-gray-200 rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Card className="p-4">
        <div className="text-center">
          <p className="text-sm text-gray-600">Unable to load analytics. {error || 'Please try again later.'}</p>
        </div>
      </Card>
    );
  }

  const formatResolutionTime = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  return (
    <div className="space-y-4">
      {/* Performance Metrics - More Compact */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs mb-0.5">Avg Resolution</p>
              <p className="text-lg font-bold text-gray-900">
                {analytics.avgResolutionHours > 0 
                  ? formatResolutionTime(analytics.avgResolutionHours)
                  : 'N/A'}
              </p>
            </div>
            <Clock className="w-6 h-6 text-gray-400" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs mb-0.5">Resolved</p>
              <p className="text-lg font-bold text-green-600">{analytics.resolvedCount}</p>
            </div>
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs mb-0.5">Total</p>
              <p className="text-lg font-bold text-gray-900">{analytics.totalTickets}</p>
            </div>
            <Building2 className="w-6 h-6 text-gray-400" />
          </div>
        </Card>
      </div>

      {/* Charts Grid - More Compact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Building Chart */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-900">
            <Building2 className="w-4 h-4" style={{ color: '#2E75B6' }} />
            Tickets by Building
          </h3>
          <BuildingChart data={analytics.buildingCounts} />
        </Card>

        {/* Urgency & Status Charts */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-900">
            <TrendingUp className="w-4 h-4" style={{ color: '#2E75B6' }} />
            Ticket Breakdown
          </h3>
          <UrgencyStatusChart 
            urgencyData={analytics.urgencyCounts}
            statusData={analytics.statusCounts}
          />
        </Card>
      </div>

      {/* Top Submitters - Full Width but Compact */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-900">
          <Users className="w-4 h-4" style={{ color: '#2E75B6' }} />
          Top Ticket Submitters
        </h3>
        <TopSubmitters submitters={analytics.topSubmitters} />
      </Card>
    </div>
  );
});
