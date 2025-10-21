'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'info' | 'warning' | 'success' | 'behavior';

interface DashboardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  subtitle: string;
  footer?: string;
  trend?: string;
  variant?: Variant;
}

const variantNumber: Record<Variant, string> = {
  info: 'text-indigo-600 dark:text-indigo-300',
  success: 'text-emerald-600 dark:text-emerald-300',
  warning: 'text-amber-600 dark:text-amber-300',
  behavior: 'text-violet-600 dark:text-violet-300',
};

export function DashboardCard({
  title,
  value,
  subtitle,
  trend,
  variant = 'info',
  className,
  ...props
}: DashboardCardProps) {
  return (
    <div
      tabIndex={0}
      className={cn(
        'group relative rounded-2xl p-3 sm:p-4 min-h-[100px] sm:min-h-[120px] backdrop-blur-sm',
        'bg-white/90 dark:bg-slate-800/90 border border-black/5 dark:border-white/10 shadow-sm',
        'transition-transform duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 outline-none',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1">
          <div className={cn('text-[26px] sm:text-[32px] font-extrabold tracking-tight metric-text', variantNumber[variant])}>
            {value}
          </div>
          <div className="mt-0.5 text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </div>
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            {subtitle}
          </div>
        </div>
        {/* Hide trend on mobile to keep compact 1x3; show on sm+ */}
        <div className="hidden sm:flex mt-2 items-center justify-start text-xs">
          {trend && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 border border-black/5 dark:border-white/20 text-slate-700 dark:text-white/90">
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardCard;


