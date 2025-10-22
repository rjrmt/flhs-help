'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, XCircle, Camera, X, RotateCcw } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface LogEntry {
  logId: string;
  studentId: string;
  studentName: string;
  timestamp: string;
  status: 'LOGGED' | 'EXCUSED';
}

interface BatchLogScannerProps {
  onLogTardy: (id: string) => Promise<{ logId: string; timestamp: string; ttsNumber: number }>;
  dailyLogs: LogEntry[];
  onExitBatch: () => void;
}

export function BatchLogScanner({ onLogTardy, dailyLogs, onExitBatch }: BatchLogScannerProps) {
  const [studentId, setStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Auto-focus input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Auto-log on 10 digits
  useEffect(() => {
    if (studentId.length === 10) {
      handleLogTardy();
    }
  }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setStudentId(value);
      // Clear messages when typing
      setSuccessMessage(null);
      setErrorMessage(null);
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
          if (error && !(error as Error).name?.includes('NotFoundException')) {
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
    // Auto-log the scanned ID
    setTimeout(() => {
      handleLogTardy();
    }, 100);
  };

  const handleLogTardy = async () => {
    if (studentId.length !== 10 || isLoading) return;
    
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      const result = await onLogTardy(studentId);
      setSuccessMessage(`Logged: ${dailyLogs.find(log => log.logId === result.logId)?.studentName || 'Student'}`);
      
      // Clear input and success message after delay
      setTimeout(() => {
        setStudentId('');
        setSuccessMessage(null);
      }, 1500);
      
    } catch (error) {
      setErrorMessage('Student not found');
      setTimeout(() => setErrorMessage(null), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm"
          className="text-white hover:bg-white/10 p-2"
          onClick={onExitBatch}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold text-white">Batch Log Mode</h2>
      </div>

      {/* Main Scanner Card */}
      <Card className="bg-white/5 backdrop-blur-sm border border-white/20">
        <div className="p-6">
          {/* Input Field or Scanner */}
          <div className="relative mb-6">
            {!showScanner ? (
              <>
                <Input
                  ref={inputRef}
                  value={studentId}
                  onChange={handleInputChange}
                  placeholder="Scan student ID..."
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={`
                    bg-white/10 border-white/30 text-white placeholder:text-slate-400 
                    focus:ring-blue-400/20 h-20 text-2xl text-center font-mono
                    ${errorMessage ? 'border-red-400 focus:border-red-400' : 'focus:border-blue-400'}
                    ${successMessage ? 'border-green-400 focus:border-green-400' : ''}
                  `}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogTardy()}
                  disabled={isLoading}
                />
                
                {/* Camera Button */}
                <button
                  onClick={() => setShowScanner(true)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  <Camera className="h-6 w-6 text-slate-400" />
                </button>
              </>
            ) : (
              <div className="relative bg-slate-800 rounded-lg overflow-hidden h-64">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
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
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="flex items-center gap-2 text-green-400 bg-green-500/10 p-4 rounded-lg border border-green-500/20 mb-4">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-4 rounded-lg border border-red-500/20 mb-4">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Instructions */}
          <div className="text-center text-slate-400 text-sm">
            <p>Scan student IDs to log tardies instantly</p>
            <p className="mt-1">No confirmation required in batch mode</p>
          </div>
        </div>
        
      </Card>

      {/* Recent Logs */}
      <Card className="bg-white/5 backdrop-blur-sm border border-white/20">
        <div className="p-4">
          <h3 className="text-white font-medium mb-3">Recent Logs</h3>
          {dailyLogs.length === 0 ? (
            <p className="text-slate-400 text-sm">No logs yet today</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {dailyLogs.slice(0, 10).map((log) => (
                <div 
                  key={log.logId}
                  className="flex items-center justify-between bg-white/5 p-3 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="outline"
                      className="bg-green-500/20 border-green-400/50 text-green-300 text-xs"
                    >
                      {log.status}
                    </Badge>
                    <span className="text-white font-medium">{log.studentName}</span>
                  </div>
                  <span className="text-slate-400 text-xs">
                    {new Date(log.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Exit Button */}
      <Button 
        onClick={onExitBatch}
        variant="outline"
        className="w-full border-white/20 text-white hover:bg-white/10 h-12"
      >
        Exit Batch Mode
      </Button>
    </div>
  );
}
