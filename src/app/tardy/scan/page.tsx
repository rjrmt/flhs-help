'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SubHeader } from '@/components/SubHeader';
import { Play, Square, Zap, ZapOff } from 'lucide-react';

// TODO: Uncomment when ready to install ZXing
// npm i @zxing/browser
// import { BrowserMultiFormatReader } from '@zxing/browser';

export default function ScanModePage() {
  const [isScanning, setIsScanning] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [scannedIds, setScannedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // TODO: Initialize ZXing reader when ready
  // const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  // Initialize audio context for beep sound
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Play beep sound when ID is scanned
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const playBeep = () => {
    if (!audioContextRef.current) return;
    
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + 0.1);
  };

  // TODO: ZXing callback function
  // const handleScanResult = (result: any) => {
  //   const scannedId = result.getText();
  //   if (!scannedIds.has(scannedId)) {
  //     setScannedIds(prev => new Set([...prev, scannedId]));
  //     console.log('Scanned ID:', scannedId);
  //     playBeep();
  //   }
  // };

  const startScanning = async () => {
    try {
      setError(null);
      setPermissionStatus('requesting');
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setIsScanning(true);
      setPermissionStatus('granted');
      
      // TODO: Initialize ZXing scanner
      // if (!readerRef.current) {
      //   readerRef.current = new BrowserMultiFormatReader();
      // }
      // 
      // try {
      //   await readerRef.current.decodeFromVideoDevice(
      //     null, // Use default camera
      //     videoRef.current,
      //     handleScanResult
      //   );
      // } catch (scanError) {
      //   console.warn('ZXing scan error:', scanError);
      // }
      
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Camera access denied or not available');
      setPermissionStatus('denied');
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // TODO: Stop ZXing scanner
    // if (readerRef.current) {
    //   readerRef.current.reset();
    // }
    
    setIsTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current || !isScanning) return;
    
    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack && 'applyConstraints' in videoTrack) {
        await videoTrack.applyConstraints({
          advanced: [{ torch: !isTorchOn } as MediaTrackConstraints]
        });
        setIsTorchOn(!isTorchOn);
      }
    } catch (err) {
      console.warn('Torch not supported on this device:', err);
      // Torch toggle failed, but don't crash the app
    }
  };

  const clearScannedIds = () => {
    setScannedIds(new Set());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-safe">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-blue-900/20 to-blue-700/20 rounded-full blur-xl floating-element"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-blue-600/20 to-blue-400/20 rounded-full blur-xl floating-element" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 left-1/3 w-28 h-28 bg-gradient-to-r from-blue-500/20 to-blue-300/20 rounded-full blur-xl floating-element" style={{animationDelay: '4s'}}></div>
      </div>

      <main className="max-w-4xl mx-auto relative z-10 min-h-screen flex flex-col">
        <SubHeader title="Scan Mode" />
        
        <div className="flex-1 px-4 pb-4">
          {/* Camera Preview Container */}
          <Card className="mb-4 bg-white/10 dark:bg-slate-800/10 backdrop-blur-sm border border-white/20 dark:border-white/10 overflow-hidden">
            <div className="relative">
              {/* Video Preview */}
              <div className="relative aspect-[9/16] sm:aspect-[4/3] lg:aspect-video bg-black rounded-t-2xl overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                
                {/* Scanning Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 border-2 border-blue-400 rounded-2xl relative">
                      {/* Corner brackets */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
                      
                      {/* Scanning line animation */}
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Permission Status Overlay */}
                {permissionStatus === 'requesting' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-white text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-sm">Requesting camera access...</p>
                    </div>
                  </div>
                )}
                
                {permissionStatus === 'denied' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-white text-center p-4">
                      <p className="text-sm mb-2">Camera access denied</p>
                      <p className="text-xs text-slate-300">Please allow camera access to scan student IDs</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Control Buttons */}
              <div className="p-4 space-y-3">
                {/* Start/Stop Button */}
                <Button
                  onClick={isScanning ? stopScanning : startScanning}
                  className={`w-full h-12 text-base font-medium transition-all duration-200 ease-out focus-ring ${
                    isScanning 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  disabled={permissionStatus === 'requesting'}
                >
                  {isScanning ? (
                    <>
                      <Square className="h-5 w-5 mr-2" />
                      Stop Scanning
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Start Scanning
                    </>
                  )}
                </Button>
                
                {/* Torch Button */}
                <Button
                  onClick={toggleTorch}
                  variant="outline"
                  className="w-full h-12 border-white/20 text-white hover:bg-white/10 text-base font-medium transition-all duration-200 ease-out focus-ring"
                  disabled={!isScanning}
                >
                  {isTorchOn ? (
                    <>
                      <ZapOff className="h-5 w-5 mr-2" />
                      Turn Off Torch
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      Turn On Torch
                    </>
                  )}
                </Button>
                
                {/* Error Message */}
                {error && (
                  <div className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded border border-red-500/20">
                    {error}
                  </div>
                )}
                
                {/* Scanning Tip */}
                {isScanning && (
                  <div className="text-center text-slate-300 text-[12px]">
                    Hold 6–12 inches away; move slowly until it locks
                  </div>
                )}
              </div>
            </div>
          </Card>
          
          {/* Scanned IDs Display */}
          {scannedIds.size > 0 && (
            <Card className="mb-4 bg-white/10 dark:bg-slate-800/10 backdrop-blur-sm border border-white/20 dark:border-white/10">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[15px] font-semibold text-white">Scanned IDs</h3>
                  <Button
                    onClick={clearScannedIds}
                    variant="outline"
                    className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:text-white h-10 text-[12px] focus-ring"
                  >
                    Clear
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {Array.from(scannedIds).map((id, index) => (
                    <div key={id} className="bg-white/5 p-2 rounded border border-white/10">
                      <div className="text-sm font-semibold text-white">ID: {id}</div>
                      <div className="text-[12px] text-slate-400">Scanned #{index + 1}</div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 text-[12px] text-slate-400 text-center">
                  {scannedIds.size} unique ID{scannedIds.size !== 1 ? 's' : ''} scanned
                </div>
              </div>
            </Card>
          )}
          
          {/* ZXing Installation Instructions */}
          <Card className="mb-4 bg-blue-500/10 border border-blue-500/20">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-blue-300 mb-2">ZXing Integration Ready</h3>
              <div className="text-xs text-slate-300 space-y-1">
                <p>To enable barcode scanning:</p>
                <p className="font-mono bg-slate-800/50 p-1 rounded">npm i @zxing/browser</p>
                <p>Then uncomment the TODO sections in the code.</p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}