'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, FileText } from 'lucide-react';
import { tokens } from '@/lib/tokens';

interface TardyRecord {
  id: string;
  date: string;
  time: string;
  reason?: string;
  excused: boolean;
}

interface StudentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    grade: string;
    homeroom: string;
    lastTardy?: string;
    ttsCount: number;
    ttcCount: number;
    ruleTriggered?: string;
  };
  recentTardies: TardyRecord[];
  currentRule: string;
}

export function StudentSheet({ 
  isOpen, 
  onClose, 
  student, 
  recentTardies, 
  currentRule 
}: StudentSheetProps) {
  const isTardyOverOneHour = (lastTardy: string) => {
    if (!lastTardy) return false;
    const tardyTime = new Date(lastTardy);
    const currentTime = new Date();
    const diffInHours = (currentTime.getTime() - tardyTime.getTime()) / (1000 * 60 * 60);
    return diffInHours > 1;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="bg-slate-900 border-slate-700 max-h-[85vh]"
      >
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-400" />
            Student Details
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Student Info Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Student ID</span>
              <span className="text-white font-medium">{student.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Grade</span>
              <Badge 
                variant="outline" 
                className="bg-blue-500/20 border-blue-400/50 text-blue-300"
              >
                Grade {student.grade}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Homeroom</span>
              <span className="text-white font-medium">{student.homeroom}</span>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div 
              className="p-4 rounded-lg"
              style={{ background: tokens.colors.glass.bg }}
            >
              <div className="text-slate-400 text-sm mb-1">TTS Count</div>
              <div className="text-orange-400 font-bold text-xl">
                {student.ttsCount}
              </div>
            </div>
            <div 
              className="p-4 rounded-lg"
              style={{ background: tokens.colors.glass.bg }}
            >
              <div className="text-slate-400 text-sm mb-1">TTC Count</div>
              <div className="text-yellow-400 font-bold text-xl">
                {student.ttcCount}
              </div>
            </div>
          </div>

          {/* Last Tardy with Warning */}
          {student.lastTardy && (
            <div className="space-y-2">
              <div className="text-slate-400 text-sm">Last Tardy</div>
              <div 
                className={`p-3 rounded-lg flex items-center gap-2 ${
                  isTardyOverOneHour(student.lastTardy)
                    ? 'bg-red-500/20 border border-red-500/30'
                    : 'bg-white/5'
                }`}
              >
                {isTardyOverOneHour(student.lastTardy) && (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                )}
                <span className={`font-medium ${
                  isTardyOverOneHour(student.lastTardy) 
                    ? 'text-red-300' 
                    : 'text-white'
                }`}>
                  {new Date(student.lastTardy).toLocaleDateString()} at{' '}
                  {new Date(student.lastTardy).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Rule Triggered */}
          {student.ruleTriggered && (
            <div className="space-y-2">
              <div className="text-slate-400 text-sm">Rule Triggered</div>
              <Badge 
                variant="outline"
                className="bg-red-500/20 border-red-400/50 text-red-300"
              >
                {student.ruleTriggered}
              </Badge>
            </div>
          )}

          {/* Recent Tardies */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-400" />
              <span className="text-white font-medium">Recent Tardies</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentTardies.map((tardy, index) => (
                <div 
                  key={tardy.id}
                  className="bg-white/5 p-3 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium">
                      Tardy #{recentTardies.length - index}
                    </span>
                    <Badge 
                      variant="outline"
                      className={`text-xs ${
                        tardy.excused 
                          ? 'bg-green-500/20 border-green-400/50 text-green-300'
                          : 'bg-orange-500/20 border-orange-400/50 text-orange-300'
                      }`}
                    >
                      {tardy.excused ? 'Excused' : 'Unexcused'}
                    </Badge>
                  </div>
                  <div className="text-slate-400 text-sm">
                    {new Date(`${tardy.date} ${tardy.time}`).toLocaleDateString()} at{' '}
                    {new Date(`${tardy.date} ${tardy.time}`).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                  {tardy.reason && (
                    <div className="text-slate-500 text-xs mt-1">
                      Reason: {tardy.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Current Rule */}
          <div className="space-y-3">
            <div className="text-white font-medium">Current Rule</div>
            <div 
              className="p-4 rounded-lg"
              style={{ background: tokens.colors.glass.bg }}
            >
              <p className="text-slate-300 text-sm leading-relaxed">
                {currentRule}
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
