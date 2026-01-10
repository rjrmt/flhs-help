'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BuildingChartProps {
  data: Record<string, number>;
}

const COLORS = ['#2E75B6', '#1e5a8f', '#4A90E2', '#6BA3E8', '#8CB6ED', '#ADD0F2', '#CEE5F7'];

export function BuildingChart({ data }: BuildingChartProps) {
  const chartData = Object.entries(data)
    .filter(([building]) => building !== 'Other' || data[building] > 0)
    .map(([building, count]) => ({
      building: building === 'Other' ? 'Other' : `Building ${building}`,
      count,
    }))
    .sort((a, b) => {
      if (a.building === 'Other') return 1;
      if (b.building === 'Other') return -1;
      return a.building.localeCompare(b.building);
    });

  return (
    <div className="w-full h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="building" 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            formatter={(value: number | undefined) => [value ?? 0, 'Tickets']}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
