'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Target, Layers, ClipboardList } from 'lucide-react';

interface DashboardHeaderProps {
  currentMode: 'SINGLE_SCAN' | 'BATCH_LOG' | 'DAILY_REVIEW';
  onModeChange: (mode: 'SINGLE_SCAN' | 'BATCH_LOG' | 'DAILY_REVIEW') => void;
  userId: string;
}

export function DashboardHeader({ currentMode, onModeChange, userId }: DashboardHeaderProps) {
  const modes = [
    {
      id: 'SINGLE_SCAN' as const,
      label: 'Single Scan',
      icon: Target,
      description: 'Individual student scanning'
    },
    {
      id: 'BATCH_LOG' as const,
      label: 'Batch Log',
      icon: Layers,
      description: 'Fast bulk logging'
    },
    {
      id: 'DAILY_REVIEW' as const,
      label: 'Daily Review',
      icon: ClipboardList,
      description: 'Review today\'s logs'
    }
  ];

  return (
    <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
      <div className="max-w-md mx-auto px-4 py-4">
        {/* App Title and User ID */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-white">Tardy Log</h1>
          <p className="text-slate-400 text-sm mt-1">User: {userId}</p>
        </div>

        {/* Segmented Control */}
        <div className="bg-slate-800/50 rounded-lg p-1 flex">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = currentMode === mode.id;
            
            return (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                className={`
                  flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-md
                  transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {mode.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
