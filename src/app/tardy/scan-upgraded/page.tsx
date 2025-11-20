'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

type Mode = 'single' | 'batch' | 'review';

export default function TardyScanPage() {
  const [mode, setMode] = useState<Mode>('single');
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [scannedIds, setScannedIds] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

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

  // Start scanning with ZXing
  const startScanning = useCallback(async () => {
    try {
      setStatus('scanning');
      setIsScanning(true);
      
      // Get cameras first
      await getCameras();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined
        },
        audio: false,
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Start ZXing scanning
      if (readerRef.current && selectedDeviceId && videoRef.current) {
        await readerRef.current.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            if (result) {
              const text = result.getText().trim();
              console.log('Barcode detected:', text);
              
              // Handle different barcode formats
              let studentId = text;
              
              // If it's a longer barcode, try to extract student ID
              if (text.length > 10) {
                const match = text.match(/\d{10}/);
                if (match) {
                  studentId = match[0];
                }
              }
              
              // Only process if it looks like a student ID (10 digits)
              if (/^\d{10}$/.test(studentId)) {
                console.log('Valid student ID found:', studentId);
                onDetected(studentId);
              } else {
                console.log('Invalid barcode format:', text);
              }
            }
            if (error && !(error as Error).name?.includes('NotFoundException')) {
              console.warn('Scan error:', error);
            }
          }
        );
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
      setIsScanning(false);
    }
  }, [selectedDeviceId, getCameras]);

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsScanning(false);
    setStatus('idle');
    setScanSuccess(false);
  };

  // Enhanced detection handler
  const onDetected = (code: string) => {
    setLastCode(code);
    setStatus('success');
    setScanSuccess(true);
    
    // Add to scanned IDs list for batch mode
    if (mode === 'batch') {
      setScannedIds(prev => [...prev, code]);
    }
    
    // Haptic feedback
    try {
      if ('vibrate' in navigator) navigator.vibrate?.(50);
    } catch {}
    
    // In single mode: auto-stop so staff sees confirmation
    if (mode === 'single') {
      setTimeout(() => {
        stopScanning();
      }, 1500);
    }

    // TODO: send to your API:
    // await fetch('/api/tardy/log', { method:'POST', body: JSON.stringify({ studentId: code, mode }) })
  };

  const switchCamera = () => {
    if (devices.length > 1) {
      const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      setSelectedDeviceId(devices[nextIndex].deviceId);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 's') (isScanning ? stopScanning() : startScanning());
      if (e.key.toLowerCase() === 'b') setMode('batch');
      if (e.key.toLowerCase() === 'd') setMode('review');
      if (e.key.toLowerCase() === 'g') setMode('single');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isScanning, startScanning]);

  // Auto-start for Single mode (optional)
  useEffect(() => {
    if (mode === 'single' && !isScanning) startScanning();
    if (mode !== 'single' && isScanning) stopScanning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0b1020]/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-5 py-5">
          <h1 className="text-3xl font-bold">Tardy Log</h1>
          <p className="mt-1 text-sm text-white/60">User: demo-user-123</p>

          {/* Tabs */}
          <div className="mt-5 inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
            {[
              { key: 'single', label: 'Single Scan', hotkey: 'G' },
              { key: 'batch', label: 'Batch Log', hotkey: 'B' },
              { key: 'review', label: 'Daily Review', hotkey: 'D' },
            ].map((t) => {
              const active = mode === (t.key as Mode);
              return (
                <button
                  key={t.key}
                  onClick={() => setMode(t.key as Mode)}
                  className={
                    'relative mx-1 rounded-xl px-4 py-2 text-sm transition ' +
                    (active ? 'bg-[#2e00df] text-white shadow-[0_0_24px_#2e00df55]' : 'text-white/80 hover:bg-white/10')
                  }
                >
                  {t.label}
                  <span className="ml-2 rounded-md border border-white/20 px-1.5 py-0.5 text-[10px] text-white/60">
                    {t.hotkey}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scanner Card */}
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          {/* Video container with professional frame */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/60 p-4">
            <div className="relative mx-auto max-w-[720px]">
              <video
                ref={videoRef}
                playsInline
                muted
                className="mx-auto aspect-video w-full rounded-2xl object-cover"
              />
              
              {/* Professional Scanning Frame Overlay */}
              <FrameOverlay scanSuccess={scanSuccess} />
              
              {/* Center Instruction Toast */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/20 bg-black/60 px-4 py-3 text-center text-sm leading-snug shadow-lg">
                {scanSuccess ? (
                  <div className="text-green-400 font-medium">✓ Barcode scanned successfully!</div>
                ) : (
                  <>
                    <div className="font-medium">Position barcode within the frame</div>
                    <div className="mt-1 text-white/70">Hold steady for automatic scanning</div>
                  </>
                )}
              </div>

              {/* Camera Controls */}
              <div className="absolute top-4 right-4 flex gap-2">
                {devices.length > 1 && (
                  <button
                    onClick={switchCamera}
                    className="rounded-full bg-black/60 px-3 py-2 text-sm backdrop-blur hover:bg-black/70"
                    title="Switch Camera"
                  >
                    🔄
                  </button>
                )}
                <button
                  onClick={() => (isScanning ? stopScanning() : startScanning())}
                  className="rounded-full bg-black/60 px-3 py-2 text-sm backdrop-blur hover:bg-black/70"
                >
                  {isScanning ? 'Stop' : 'Start'}
                </button>
              </div>

              {/* Status pill */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <StatusPill status={status} lastCode={lastCode} />
              </div>
            </div>
          </div>

          {/* Actions footer */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-white/60">
              Shortcuts: <b>S</b> Start/Stop • <b>G</b> Single • <b>B</b> Batch • <b>D</b> Review
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => (isScanning ? stopScanning() : startScanning())}
                className="rounded-xl bg-[#2e00df] px-4 py-2 text-sm font-medium shadow-[0_0_24px_#2e00df55] hover:opacity-90"
              >
                {isScanning ? 'Stop Scanning' : 'Start Scanning'}
              </button>
              <button
                onClick={() => {
                  setLastCode(null);
                  setStatus('idle');
                  setScanSuccess(false);
                }}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Mode-specific UI */}
          {mode === 'batch' && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
              <div className="font-medium">Batch Log</div>
              <p className="mt-1 text-white/70">
                Keep the camera running and scan multiple student IDs. We'll append each to today's log.
              </p>
              
              {/* Scanned IDs List */}
              {scannedIds.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs text-white/60">Scanned IDs ({scannedIds.length}):</div>
                  <div className="grid grid-cols-2 gap-2">
                    {scannedIds.map((id, index) => (
                      <div key={index} className="bg-white/5 p-2 rounded text-xs">
                        {id}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'review' && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
              <div className="font-medium">Daily Review</div>
              <p className="mt-1 text-white/70">Show today's totals and the last 25 scans with status.</p>
              {/* TODO: fetch and render your review table */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------- Enhanced UI Subcomponents ----------------- */
function FrameOverlay({ scanSuccess }: { scanSuccess: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-content-center">
      <div className={`relative h-[56%] w-[78%] rounded-[24px] transition-all duration-300 ${
        scanSuccess ? 'bg-green-500/10' : ''
      }`}>
        {/* Glow */}
        <div className={`absolute inset-0 rounded-[24px] ring-2 blur-[1px] ${
          scanSuccess ? 'ring-green-400/60' : 'ring-red-400/60'
        }`} />
        
        {/* Corner brackets */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
          {corner(6, 6, 24, 'tl', scanSuccess)}
          {corner(94, 6, 24, 'tr', scanSuccess)}
          {corner(6, 94, 24, 'bl', scanSuccess)}
          {corner(94, 94, 24, 'br', scanSuccess)}
        </svg>
        
        {/* Animated scanning line */}
        {!scanSuccess && (
          <div className="absolute inset-0 overflow-hidden rounded-[24px]">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-scan-line"></div>
          </div>
        )}
        
        {/* Success checkmark */}
        {scanSuccess && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-green-500 rounded-full flex items-center justify-center animate-pulse">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
        
        {/* Center crosshair */}
        {!scanSuccess && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border border-red-500/50 rounded-full">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-red-500 rounded-full"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function corner(x: number, y: number, len: number, pos: 'tl' | 'tr' | 'bl' | 'br', scanSuccess: boolean) {
  const color = scanSuccess ? '#22c55e' : '#ef4444';
  const w = 3; // stroke width
  let path = '';
  if (pos === 'tl') path = `M ${x} ${y + len} V ${y} H ${x + len}`;
  if (pos === 'tr') path = `M ${x - len} ${y} H ${x} V ${y + len}`;
  if (pos === 'bl') path = `M ${x} ${y - len} V ${y} H ${x + len}`;
  if (pos === 'br') path = `M ${x - len} ${y} H ${x} V ${y - len}`;
  return <path key={pos} d={path} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" />;
}

function StatusPill({ status, lastCode }: { status: 'idle' | 'scanning' | 'success' | 'error'; lastCode: string | null }) {
  const map = {
    idle: { dot: '●', text: 'Idle', cls: 'bg-white/10 border-white/15' },
    scanning: { dot: '●', text: 'Scanning…', cls: 'bg-black/60 border-white/20' },
    success: { dot: '●', text: lastCode ? `Captured: ${lastCode}` : 'Captured', cls: 'bg-green-500/15 border-green-400/30 text-green-200' },
    error: { dot: '●', text: 'Camera error', cls: 'bg-red-500/15 border-red-400/30 text-red-200' },
  }[status];

  return (
    <div className={`rounded-full border px-3 py-1 text-sm backdrop-blur ${map.cls}`}>
      <span className="mr-2 align-middle text-xs opacity-80">{map.dot}</span>
      <span className="align-middle">{map.text}</span>
    </div>
  );
}



