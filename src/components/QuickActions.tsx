'use client';
import { Button } from "@/components/ui/button";

export function QuickActions() {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-2 px-2">
      <Button 
        variant="outline" 
        size="sm" 
        className="rounded-full px-3 py-1.5 text-[12.5px] bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-white/10 hover:bg-white/90 dark:hover:bg-slate-700/90 flex-shrink-0"
      >
        Open Kiosk
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className="rounded-full px-3 py-1.5 text-[12.5px] bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-white/10 hover:bg-white/90 dark:hover:bg-slate-700/90 flex-shrink-0"
      >
        Verify Pass
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className="rounded-full px-3 py-1.5 text-[12.5px] bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-white/10 hover:bg-white/90 dark:hover:bg-slate-700/90 flex-shrink-0"
      >
        Emergency Alert
      </Button>
    </div>
  );
}
