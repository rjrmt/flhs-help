'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { BuildingChart } from './BuildingChart';
import { TopSubmitters } from './TopSubmitters';
import { UrgencyStatusChart } from './UrgencyStatusChart';
import { Building2, Users, Clock, TrendingUp } from 'lucide-react';

interface AnalyticsData {
  buildingCounts: Record<string, number>;
  topSubmitters: Array<{ name: string; count: number }>;
  urgencyCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  totalTickets: number;
  avgResolutionHours: number;
  resolvedCount: number;
}

export function DashboardAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch('/api/analytics/tickets');
        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }
        const data = await response.json();
        if (data.success) {
          setAnalytics(data.analytics);
        } else {
          throw new Error(data.error || 'Failed to fetch analytics');
        }
      } catch (err: any) {
        console.error('Analytics fetch error:', err);
        setError(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </Card>
        <Card>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Card className="mb-8">
        <div className="p-6 text-center">
          <p className="text-gray-600">Unable to load analytics. {error || 'Please try again later.'}</p>
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
    <div className="space-y-6 mb-8">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Avg Resolution Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.avgResolutionHours > 0 
                  ? formatResolutionTime(analytics.avgResolutionHours)
                  : 'N/A'}
              </p>
            </div>
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Resolved Tickets</p>
              <p className="text-2xl font-bold text-green-600">{analytics.resolvedCount}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalTickets}</p>
            </div>
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
        </Card>
      </div>

      {/* Building Chart */}
      <Card>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
          <Building2 className="w-5 h-5" style={{ color: '#2E75B6' }} />
          Tickets by Building
        </h2>
        <BuildingChart data={analytics.buildingCounts} />
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Submitters */}
        <Card>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
            <Users className="w-5 h-5" style={{ color: '#2E75B6' }} />
            Top Ticket Submitters
          </h2>
          <TopSubmitters submitters={analytics.topSubmitters} />
        </Card>

        {/* Urgency & Status Charts */}
        <Card>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
            <TrendingUp className="w-5 h-5" style={{ color: '#2E75B6' }} />
            Ticket Breakdown
          </h2>
          <UrgencyStatusChart 
            urgencyData={analytics.urgencyCounts}
            statusData={analytics.statusCounts}
          />
        </Card>
      </div>
    </div>
  );
}
