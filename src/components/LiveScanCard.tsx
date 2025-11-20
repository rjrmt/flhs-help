'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { BarcodeScanner } from '@/components/BarcodeScanner';

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

  // Handle scanner success
  const handleScannerSuccess = (scannedId: string) => {
    setStudentId(scannedId);
    handleVerify(scannedId);
  };

  const handleVerify = async (id?: string) => {
    const verifyId = id || studentId;
    if (verifyId.length !== 10) return;
    
    console.log('Verifying student ID:', verifyId);
    setIsLoading(true);
    setState('scanning');
    
    try {
      const result = await onVerify(verifyId);
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


  const excuseReasons = [
    { id: 'medical', label: 'Medical Appointment' },
    { id: 'family', label: 'Family Emergency' },
    { id: 'transportation', label: 'Transportation Issue' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-6">

      {/* Live Scan Card */}
      <Card className="bg-white/5 backdrop-blur-sm border border-white/20">
        <div className="p-6">
           {/* Input Section */}
           {(state === 'idle' || state === 'scanning' || state === 'error') && (
             <div className="space-y-4">
               <BarcodeScanner
                 onScanSuccess={handleScannerSuccess}
                 placeholder="Scan ID or Type..."
                 className="w-full"
                 autoFocus={true}
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
              {/* HUGE Student Name */}
              <div className="text-center">
                <h2 className="text-4xl font-black text-white mb-4 tracking-wide">
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

              {/* Alert Badges - Prominent Display */}
              <div className="space-y-3">
                {/* Rule Triggered - Subdued Red Banner */}
                {student.ruleTriggered && (
                  <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      <span className="text-red-300 font-medium">
                        RULE TRIGGERED: {student.ruleTriggered}
                      </span>
                    </div>
                  </div>
                )}

                {/* Informational Data - Low-contrast Neutral Pills */}
                <div className="flex flex-wrap gap-2">
                  {/* Last Tardy Chip */}
                  {student.lastTardy && (
                    <Badge 
                      variant="outline"
                      className="bg-slate-700/50 border-slate-600/50 text-slate-300 text-sm px-3 py-1"
                    >
                      Last: {new Date(student.lastTardy).toLocaleDateString()}
                    </Badge>
                  )}

                  {/* TTS Chip */}
                  <Badge 
                    variant="outline"
                    className="bg-slate-700/50 border-slate-600/50 text-slate-300 text-sm px-3 py-1"
                  >
                    TTS#{student.ttsCount}
                  </Badge>

                  {/* TTC Chip */}
                  <Badge 
                    variant="outline"
                    className="bg-slate-700/50 border-slate-600/50 text-slate-300 text-sm px-3 py-1"
                  >
                    TTC#{student.ttcCount}
                  </Badge>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Primary Button - Electric Blue */}
                <Button 
                  onClick={handleLogTardy}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-16 text-xl font-bold shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  ) : (
                    <CheckCircle className="h-6 w-6 mr-3" />
                  )}
                  LOG TARDY ({student.firstName.toUpperCase()})
                </Button>

                {/* Secondary Actions - Subtle Text Links */}
                <div className="flex justify-center gap-6 text-sm">
                  <Sheet open={isExcuseOpen} onOpenChange={setIsExcuseOpen}>
                    <SheetTrigger asChild>
                      <button className="text-slate-400 hover:text-white transition-colors">
                        Excuse
                      </button>
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

                  <button 
                    onClick={resetToIdle}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
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
                            {[1, 2, 3, 4, 5].map((i) => {
                              const date = new Date(2024, 0, 15 - i, 8, 15);
                              return (
                                <div key={i} className="bg-white/5 p-3 rounded-lg">
                                  <div className="flex justify-between items-center">
                                    <span className="text-white">Tardy #{i}</span>
                                    <span className="text-slate-400">{date.toLocaleDateString()} {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  </div>
                                </div>
                              );
                            })}
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
                {new Date(lastLog.timestamp).toLocaleString()} · TTS#{lastLog.ttsNumber}
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
    </div>
  );
}