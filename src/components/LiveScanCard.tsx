'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, FileText, User, MoreHorizontal } from 'lucide-react';

// Types
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  homeroom: string;
  lastTardy?: string;
  ttsCount: number;
  ttcCount: number;
  ruleTriggered?: string;
}

interface LiveScanCardProps {
  onVerify: (id: string) => Promise<Student | null>;
  onExcuse: (id: string, reason: string) => Promise<void>;
  onUndo: (logId: string) => Promise<void>;
  onLogTardy: (id: string) => Promise<{ logId: string; timestamp: string; ttsNumber: number }>;
}

type ScanState = 'idle' | 'scanning' | 'identified' | 'success' | 'error';

export function LiveScanCard({ onVerify, onExcuse, onUndo, onLogTardy }: LiveScanCardProps) {
  const [state, setState] = useState<ScanState>('idle');
  const [studentId, setStudentId] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [isExcuseOpen, setIsExcuseOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [lastLog, setLastLog] = useState<{ logId: string; timestamp: string; ttsNumber: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus and refocus input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [state]);

  // Auto-verify on 10 digits
  useEffect(() => {
    if (studentId.length === 10) {
      handleVerify();
    }
  }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setStudentId(value);
    }
  };

  const handleVerify = async () => {
    if (studentId.length !== 10) return;
    
    console.log('Verifying student ID:', studentId);
    setIsLoading(true);
    setState('scanning');
    
    try {
      const result = await onVerify(studentId);
      console.log('Verification result:', result);
      if (result) {
        setStudent(result);
        setState('identified');
      } else {
        console.log('Student not found');
        setState('error');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setState('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogTardy = async () => {
    if (!student) return;
    
    setIsLoading(true);
    try {
      const result = await onLogTardy(student.id);
      setLastLog(result);
      setState('success');
      
      // Show undo toast for 10 seconds
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 10000);
      
      // Reset after success pulse
      setTimeout(() => {
        resetToIdle();
      }, 2000);
    } catch {
      setIsLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!lastLog) return;
    
    try {
      await onUndo(lastLog.logId);
      setShowUndo(false);
      resetToIdle();
    } catch (error) {
      console.error('Failed to undo:', error);
    }
  };

  const resetToIdle = () => {
    setState('idle');
    setStudentId('');
    setStudent(null);
    setLastLog(null);
    setIsLoading(false);
  };

  // Auto-reset error state when typing
  useEffect(() => {
    if (state === 'error' && studentId.length > 0) {
      setState('idle');
    }
  }, [studentId, state]);

  const isTardyOverOneHour = (lastTardy: string) => {
    if (!lastTardy) return false;
    const tardyTime = new Date(lastTardy);
    const currentTime = new Date();
    const diffInHours = (currentTime.getTime() - tardyTime.getTime()) / (1000 * 60 * 60);
    return diffInHours > 1;
  };

  const excuseReasons = [
    { id: 'medical', label: 'Medical Appointment' },
    { id: 'family', label: 'Family Emergency' },
    { id: 'transportation', label: 'Transportation Issue' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      <main className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-white/10 p-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Tardy Log</h1>
          <div className="ml-auto">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 p-2">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-slate-900 border-slate-700">
                <SheetHeader>
                  <SheetTitle className="text-white">More Options</SheetTitle>
                </SheetHeader>
                <div className="grid gap-3 mt-6">
                  <Button variant="outline" className="justify-start h-12 text-left">
                    <Clock className="h-4 w-4 mr-3" />
                    24-Hour Log
                  </Button>
                  <Button variant="outline" className="justify-start h-12 text-left">
                    <FileText className="h-4 w-4 mr-3" />
                    Reports
                  </Button>
                  <Button variant="outline" className="justify-start h-12 text-left">
                    <User className="h-4 w-4 mr-3" />
                    Admin
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Live Scan Card */}
        <Card className="mb-6 bg-white/5 backdrop-blur-sm border border-white/20">
          <div className="p-6">
            {/* Input Section */}
            {(state === 'idle' || state === 'scanning' || state === 'error') && (
              <div className="space-y-4">
                <Input
                  ref={inputRef}
                  value={studentId}
                  onChange={handleInputChange}
                  placeholder="Enter student ID..."
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={`bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:ring-blue-400/20 h-14 text-lg text-center ${
                    state === 'error' ? 'border-red-400 focus:border-red-400' : 'focus:border-blue-400'
                  }`}
                  onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                  disabled={isLoading}
                />
                
                {isLoading && (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                  </div>
                )}

                {state === 'error' && (
                  <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded border border-red-500/20">
                    <XCircle className="h-4 w-4" />
                    <span>Student not found. Please try again.</span>
                  </div>
                )}
              </div>
            )}

            {/* Identified State */}
            {state === 'identified' && student && (
              <div className="space-y-6">
                {/* Large Title Name */}
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {student.firstName} {student.lastName}
                  </h2>
                  
                  {/* Grade Pill */}
                  <Badge 
                    variant="outline" 
                    className="bg-blue-500/20 border-blue-400/50 text-blue-300 text-sm px-3 py-1"
                  >
                    Grade {student.grade}
                  </Badge>
                </div>

                {/* ID/Homeroom Row */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">ID: {student.id}</span>
                  <span className="text-slate-400">Homeroom: {student.homeroom}</span>
                </div>

                {/* Chips Row */}
                <div className="flex flex-wrap gap-2">
                  {/* Last Tardy Chip */}
                  {student.lastTardy && (
                    <Badge 
                      variant="outline"
                      className={`text-sm px-3 py-1 ${
                        isTardyOverOneHour(student.lastTardy)
                          ? 'bg-red-500/20 border-red-400/50 text-red-300'
                          : 'bg-white/10 border-white/20 text-white'
                      }`}
                    >
                      {isTardyOverOneHour(student.lastTardy) && (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      )}
                      Last: {new Date(student.lastTardy).toLocaleDateString()}
                    </Badge>
                  )}

                  {/* TTS Chip */}
                  <Badge 
                    variant="outline"
                    className="bg-orange-500/20 border-orange-400/50 text-orange-300 text-sm px-3 py-1"
                  >
                    TTS#{student.ttsCount}
                  </Badge>

                  {/* TTC Chip */}
                  <Badge 
                    variant="outline"
                    className="bg-yellow-500/20 border-yellow-400/50 text-yellow-300 text-sm px-3 py-1"
                  >
                    TTC#{student.ttcCount}
                  </Badge>

                  {/* Rule Chip */}
                  {student.ruleTriggered && (
                    <Badge 
                      variant="outline"
                      className="bg-red-500/20 border-red-400/50 text-red-300 text-sm px-3 py-1"
                    >
                      Rule: {student.ruleTriggered}
                    </Badge>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Primary Button */}
                  <Button 
                    onClick={handleLogTardy}
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-medium"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    ) : (
                      <CheckCircle className="h-5 w-5 mr-2" />
                    )}
                    Log Tardy
                  </Button>

                  {/* Secondary Row */}
                  <div className="flex gap-3">
                    <Sheet open={isExcuseOpen} onOpenChange={setIsExcuseOpen}>
                      <SheetTrigger asChild>
                        <Button 
                          variant="outline"
                          className="flex-1 border-white/20 text-white hover:bg-white/10 h-10"
                        >
                          Excuse
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="bg-slate-900 border-slate-700">
                        <SheetHeader>
                          <SheetTitle className="text-white">Excuse Reason</SheetTitle>
                        </SheetHeader>
                        <div className="grid gap-3 mt-6">
                          {excuseReasons.map((reason) => (
                            <Button
                              key={reason.id}
                              variant="outline"
                              className="justify-start h-12 text-left"
                              onClick={() => {
                                onExcuse(student.id, reason.id);
                                setIsExcuseOpen(false);
                                resetToIdle();
                              }}
                            >
                              {reason.label}
                            </Button>
                          ))}
                        </div>
                      </SheetContent>
                    </Sheet>

                    <Button 
                      onClick={resetToIdle}
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-white/10 h-10"
                    >
                      Clear
                    </Button>
                  </div>

                  {/* Details Disclosure */}
                  <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                    <SheetTrigger asChild>
                      <Button 
                        variant="ghost"
                        className="w-full text-slate-400 hover:text-white hover:bg-white/5 h-10"
                      >
                        Details
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="bg-slate-900 border-slate-700 max-h-[80vh]">
                      <SheetHeader>
                        <SheetTitle className="text-white">Student Details</SheetTitle>
                      </SheetHeader>
                      <div className="mt-6 space-y-4">
                        {/* Last 5 Tardies */}
                        <div>
                          <h3 className="text-white font-medium mb-3">Recent Tardies</h3>
                          <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div key={i} className="bg-white/5 p-3 rounded-lg">
                                <div className="flex justify-between items-center">
                                  <span className="text-white">Tardy #{i}</span>
                                  <span className="text-slate-400">Jan {15 - i}, 2024 8:15 AM</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Current Rule */}
                        <div>
                          <h3 className="text-white font-medium mb-3">Current Rule</h3>
                          <div className="bg-white/5 p-3 rounded-lg">
                            <p className="text-slate-300 text-sm">
                              Students who accumulate 5 tardies in a semester will receive detention.
                              Additional tardies result in progressive discipline.
                            </p>
                          </div>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            )}

            {/* Success State */}
            {state === 'success' && lastLog && (
              <div className="text-center space-y-4">
                <div className="animate-pulse">
                  <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                </div>
                <h3 className="text-white text-lg font-medium">Logged</h3>
                <p className="text-slate-400">
                  {lastLog.timestamp} · TTS#{lastLog.ttsNumber}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Undo Toast */}
        {showUndo && lastLog && (
          <div className="fixed bottom-6 left-4 right-4 z-50 bg-white/5 backdrop-blur-sm border border-white/20">
            <div className="p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Tardy logged successfully</p>
                  <p className="text-slate-400 text-sm">Tap to undo</p>
                </div>
                <Button
                  onClick={handleUndo}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Undo
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}