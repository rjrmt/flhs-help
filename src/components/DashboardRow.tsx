'use client';
import * as React from 'react';

/**
 * One-row dashboard wrapper
 * - Mobile: horizontal scroll with snap
 * - md+: single grid row (no scroll)
 */
export function DashboardRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 xl:gap-6 w-full">
      {children}
    </div>
  );
}

export default DashboardRow;


