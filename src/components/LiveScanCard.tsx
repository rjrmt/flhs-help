'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, FileText, User, MoreHorizontal, ScanLine, X, RotateCcw } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

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
  const router = useRouter();
  const [state, setState] = useState<ScanState>('idle');
  const [studentId, setStudentId] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [isExcuseOpen, setIsExcuseOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [lastLog, setLastLog] = useState<{ logId: string; timestamp: string; ttsNumber: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

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

  // Initialize scanner
  useEffect(() => {
    if (!readerRef.current) {
      readerRef.current = new BrowserMultiFormatReader();
    }
    
    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  // Get available cameras
  const getCameras = useCallback(async () => {
    try {
      const videoInputDevices = await readerRef.current?.listVideoInputDevices();
      if (videoInputDevices && videoInputDevices.length > 0) {
        setDevices(videoInputDevices);
        // Prefer back camera if available
        const backCamera = videoInputDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        setSelectedDeviceId(backCamera?.deviceId || videoInputDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
    }
  }, []);

  // Start scanning
  const startScanning = useCallback(async () => {
    if (!readerRef.current || !selectedDeviceId || !videoRef.current) return;

    try {
      await readerRef.current.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const text = result.getText();
            // Only process if it looks like a student ID (10 digits)
            if (/^\d{10}$/.test(text)) {
              handleScannerSuccess(text);
            }
          }
          if (error && !(error as any).name?.includes('NotFoundException')) {
            console.warn('Scan error:', error);
          }
        }
      );
    } catch (err) {
      console.error('Error starting scan:', err);
    }
  }, [selectedDeviceId]);

  // Initialize when scanner opens
  useEffect(() => {
    if (showScanner) {
      getCameras();
    }
  }, [showScanner, getCameras]);

  // Start scanning when we have device
  useEffect(() => {
    if (showScanner && selectedDeviceId) {
      startScanning();
    }
  }, [showScanner, selectedDeviceId, startScanning]);

  const switchCamera = () => {
    if (devices.length > 1) {
      const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      setSelectedDeviceId(devices[nextIndex].deviceId);
    }
  };

  const handleScannerSuccess = (scannedId: string) => {
    setStudentId(scannedId);
    setShowScanner(false);
    // Auto-verify the scanned ID
    setTimeout(() => {
      handleVerify();
    }, 100);
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
    <div className="space-y-6">

      {/* Live Scan Card */}
      <Card className="bg-white/5 backdrop-blur-sm border border-white/20">
        <div className="p-6">
          {/* Input Section */}
          {(state === 'idle' || state === 'scanning' || state === 'error') && (
            <div className="space-y-4">
              {!showScanner ? (
                <div className="relative">
                  <Input
                    ref={inputRef}
                    value={studentId}
                    onChange={handleInputChange}
                    placeholder="Scan ID or Type..."
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={`bg-white/10 border-white/30 text-white placeholder:text-slate-400 focus:ring-blue-400/20 h-16 text-xl text-center font-mono ${
                      state === 'error' ? 'border-red-400 focus:border-red-400' : 'focus:border-blue-400'
                    }`}
                    onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                    disabled={isLoading}
                  />
                  
                  {/* Barcode Scanner Button */}
                  <button
                    onClick={() => setShowScanner(true)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors"
                    disabled={isLoading}
                  >
                    <ScanLine className="h-6 w-6 text-slate-400" />
                  </button>
                </div>
              ) : (
                <div className="relative bg-slate-800 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-64 object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                  
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-32 border-2 border-blue-400 rounded-lg bg-blue-400/10 backdrop-blur-sm">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-1 h-8 bg-blue-400 animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Close scanner button */}
                  <button
                    onClick={() => setShowScanner(false)}
                    className="absolute top-4 right-4 p-2 bg-black/50 rounded-lg hover:bg-black/70 transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                  
                  {/* Camera controls */}
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between">
                    <div className="flex gap-2">
                      {devices.length > 1 && (
                        <button
                          onClick={switchCamera}
                          className="p-2 bg-black/50 rounded-lg hover:bg-black/70 transition-colors"
                        >
                          <RotateCcw className="h-4 w-4 text-white" />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-white text-sm">Scanning...</span>
                    </div>
                  </div>
                </div>
              )}
                
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