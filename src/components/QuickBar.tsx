'use client';
import { ScanLine, Shield, AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';

export function QuickBar() {
  const pills = [
    {
      href: '/tardy/scan',
      icon: ScanLine,
      label: 'Scan ID'
    },
    {
      href: '/tardy/verify',
      icon: Shield,
      label: 'Verify Student'
    },
    {
      href: '/tardy/report',
      icon: AlertTriangle,
      label: 'Report Issue'
    },
    {
      href: '/tardy',
      icon: Clock,
      label: 'Tardy Log'
    }
  ];

  return (
    <div className="px-4 py-3">
      <div className="flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Quick navigation">
        {pills.map((pill) => (
          <Link
            key={pill.href}
            href={pill.href}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-[12px] font-medium text-white transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 whitespace-nowrap flex-shrink-0 min-h-[44px]"
            role="tab"
            aria-label={`Navigate to ${pill.label}`}
          >
            <pill.icon className="h-4 w-4" />
            {pill.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
