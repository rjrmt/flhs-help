'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface UrgencyStatusChartProps {
  urgencyData: Record<string, number>;
  statusData: Record<string, number>;
}

const URGENCY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#f59e0b',
  low: '#10b981',
};

const STATUS_COLORS: Record<string, string> = {
  submitted: '#fbbf24',
  in_progress: '#3b82f6',
  resolved: '#10b981',
  closed: '#6b7280',
};

export function UrgencyStatusChart({ urgencyData, statusData }: UrgencyStatusChartProps) {
  const urgencyChartData = Object.entries(urgencyData)
    .filter(([, count]) => count > 0)
    .map(([urgency, count]) => ({
      name: urgency.charAt(0).toUpperCase() + urgency.slice(1),
      value: count,
      color: URGENCY_COLORS[urgency] || '#6b7280',
    }));

  const statusChartData = Object.entries(statusData)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count,
      color: STATUS_COLORS[status] || '#6b7280',
    }));

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Urgency Chart */}
      <div>
        <h3 className="text-xs font-medium text-gray-700 mb-2 text-center">By Urgency</h3>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={urgencyChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
              >
                {urgencyChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Chart */}
      <div>
        <h3 className="text-xs font-medium text-gray-700 mb-2 text-center">By Status</h3>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
              >
                {statusChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
