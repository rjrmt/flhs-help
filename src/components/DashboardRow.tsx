'use client';
import * as React from 'react';

/**
 * One-row dashboard wrapper
 * - Mobile: horizontal scroll with snap
 * - md+: single grid row (no scroll)
 */
export function DashboardRow({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {/* Mobile: single column, full width, uniform spacing */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {children}
      </div>

      {/* Desktop/tablet: single grid row */}
      <div className="hidden md:grid md:auto-cols-fr md:grid-flow-col md:gap-4">
        {children}
      </div>
    </div>
  );
}

export default DashboardRow;


