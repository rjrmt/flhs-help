'use client';
import { Button } from "@/components/ui/button";

export function QuickActions() {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-2 px-2">
      <Button 
        variant="outline" 
        size="sm" 
        className="rounded-full px-3 py-1.5 text-[12px] bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-white/30 dark:border-white/20 hover:bg-white/95 dark:hover:bg-slate-700/95 flex-shrink-0 shadow-sm hover:shadow-md transition-all duration-200"
      >
        Open Kiosk
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className="rounded-full px-3 py-1.5 text-[12px] bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-white/30 dark:border-white/20 hover:bg-white/95 dark:hover:bg-slate-700/95 flex-shrink-0 shadow-sm hover:shadow-md transition-all duration-200"
      >
        Verify Pass
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className="rounded-full px-3 py-1.5 text-[12px] bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-white/30 dark:border-white/20 hover:bg-white/95 dark:hover:bg-slate-700/95 flex-shrink-0 shadow-sm hover:shadow-md transition-all duration-200"
      >
        Emergency Alert
      </Button>
    </div>
  );
}
