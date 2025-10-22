'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Search, RotateCcw, CheckCircle, Filter } from 'lucide-react';

interface LogEntry {
  logId: string;
  studentId: string;
  studentName: string;
  timestamp: string;
  status: 'LOGGED' | 'EXCUSED';
}

interface DailyReviewListProps {
  dailyLogs: LogEntry[];
  onUndo: (logId: string) => Promise<void>;
  onExcuse: (id: string, reason: string) => Promise<void>;
}

export function DailyReviewList({ dailyLogs, onUndo, onExcuse }: DailyReviewListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOGGED' | 'EXCUSED'>('ALL');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter logs based on search term and status
  const filteredLogs = dailyLogs.filter(log => {
    const matchesSearch = log.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.studentId.includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUndoLog = async (log: LogEntry) => {
    await onUndo(log.logId);
    setIsDialogOpen(false);
    setSelectedLog(null);
  };

  const handleExcuseLog = async (log: LogEntry, reason: string) => {
    await onExcuse(log.studentId, reason);
    setIsDialogOpen(false);
    setSelectedLog(null);
  };

  const openLogDialog = (log: LogEntry) => {
    setSelectedLog(log);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm"
          className="text-white hover:bg-white/10 p-2"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold text-white">Daily Review</h2>
        <div className="ml-auto">
          <Badge variant="outline" className="bg-blue-500/20 border-blue-400/50 text-blue-300">
            {dailyLogs.length} Total
          </Badge>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <Card className="bg-white/5 backdrop-blur-sm border border-white/20">
        <div className="p-4 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or ID..."
              className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:ring-blue-400/20 pl-10"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {['ALL', 'LOGGED', 'EXCUSED'].map((status) => (
              <Button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                className={`
                  flex-1
                  ${statusFilter === status 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                  }
                `}
              >
                {status === 'ALL' ? 'All' : status}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <Card className="bg-white/5 backdrop-blur-sm border border-white/20">
            <div className="p-8 text-center">
              <div className="text-slate-400 mb-2">
                {dailyLogs.length === 0 ? (
                  <p className="text-lg">No logs recorded today</p>
                ) : (
                  <p className="text-lg">No logs match your search</p>
                )}
              </div>
              <p className="text-slate-500 text-sm">
                {dailyLogs.length === 0 
                  ? 'Start logging tardies to see them here' 
                  : 'Try adjusting your search terms or filters'
                }
              </p>
            </div>
          </Card>
        ) : (
          filteredLogs.map((log) => (
            <Card 
              key={log.logId}
              className="bg-white/5 backdrop-blur-sm border border-white/20 hover:bg-white/10 transition-colors cursor-pointer"
              onClick={() => openLogDialog(log)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="outline"
                      className={`
                        ${log.status === 'LOGGED' 
                          ? 'bg-green-500/20 border-green-400/50 text-green-300' 
                          : 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                        }
                      `}
                    >
                      {log.status}
                    </Badge>
                    <div>
                      <h3 className="text-white font-medium">{log.studentName}</h3>
                      <p className="text-slate-400 text-sm">ID: {log.studentId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-medium">
                      {new Date(log.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Log Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Log Actions</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="bg-white/5 p-4 rounded-lg">
                <h3 className="text-white font-medium">{selectedLog.studentName}</h3>
                <p className="text-slate-400 text-sm">ID: {selectedLog.studentId}</p>
                <p className="text-slate-400 text-sm">
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </p>
                <Badge 
                  variant="outline"
                  className={`
                    mt-2
                    ${selectedLog.status === 'LOGGED' 
                      ? 'bg-green-500/20 border-green-400/50 text-green-300' 
                      : 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                    }
                  `}
                >
                  {selectedLog.status}
                </Badge>
              </div>

              <div className="space-y-3">
                {selectedLog.status === 'LOGGED' && (
                  <>
                    <Button
                      onClick={() => handleExcuseLog(selectedLog, 'medical')}
                      variant="outline"
                      className="w-full justify-start border-white/20 text-white hover:bg-white/10"
                    >
                      <CheckCircle className="h-4 w-4 mr-3" />
                      Excuse (Medical)
                    </Button>
                    <Button
                      onClick={() => handleExcuseLog(selectedLog, 'transportation')}
                      variant="outline"
                      className="w-full justify-start border-white/20 text-white hover:bg-white/10"
                    >
                      <CheckCircle className="h-4 w-4 mr-3" />
                      Excuse (Transportation)
                    </Button>
                  </>
                )}
                
                <Button
                  onClick={() => handleUndoLog(selectedLog)}
                  variant="outline"
                  className="w-full justify-start border-red-400/50 text-red-300 hover:bg-red-500/10"
                >
                  <RotateCcw className="h-4 w-4 mr-3" />
                  Undo Log
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
