'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Undo } from 'lucide-react';
import { tokens, glassEffect } from '@/lib/tokens';

interface UndoToastProps {
  isVisible: boolean;
  onUndo: () => void;
  timestamp: string;
  ttsNumber: number;
  duration?: number; // in milliseconds
}

export function UndoToast({ 
  isVisible, 
  onUndo, 
  timestamp, 
  ttsNumber, 
  duration = 10000 
}: UndoToastProps) {
  const [timeLeft, setTimeLeft] = useState(duration / 1000);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isVisible) return;

    setTimeLeft(duration / 1000);
    setProgress(100);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 0.1;
        setProgress((newTime / (duration / 1000)) * 100);
        
        if (newTime <= 0) {
          clearInterval(interval);
          return 0;
        }
        return newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, duration]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed bottom-6 left-4 right-4 z-50 animate-in slide-in-from-bottom-4"
      style={{
        background: glassEffect.background,
        backdropFilter: glassEffect.backdropFilter,
        border: `1px solid ${tokens.colors.glass.border}`,
      }}
    >
      <div className="p-4 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="absolute inset-0 animate-ping">
                <CheckCircle className="h-5 w-5 text-green-400 opacity-30" />
              </div>
            </div>
            <div>
              <p className="text-white font-medium">Tardy logged successfully</p>
              <p className="text-slate-400 text-sm">
                {timestamp} · TTS#{ttsNumber}
              </p>
            </div>
          </div>
          
          <Button
            onClick={onUndo}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1"
          >
            <Undo className="h-3 w-3" />
            Undo
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-1">
          <div 
            className="bg-red-500 h-1 rounded-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Countdown */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-slate-500 text-xs">
            Auto-hide in {Math.ceil(timeLeft)}s
          </span>
          <span className="text-slate-500 text-xs">
            Tap undo to reverse this action
          </span>
        </div>
      </div>
    </div>
  );
}
