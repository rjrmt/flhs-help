'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, CameraOff, RotateCcw } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: Error) => void;
  isActive: boolean;
  className?: string;
}

export function BarcodeScanner({ onScan, onError, isActive, className }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

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
        setHasPermission(true);
      } else {
        setHasPermission(false);
        setError('No cameras found');
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
      setHasPermission(false);
      setError('Failed to access cameras');
    }
  }, []);

  // Start scanning
  const startScanning = useCallback(async () => {
    if (!readerRef.current || !selectedDeviceId || !videoRef.current) return;

    try {
      setIsScanning(true);
      setError(null);

      await readerRef.current.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const text = result.getText();
            // Only process if it looks like a student ID (10 digits)
            if (/^\d{10}$/.test(text)) {
              onScan(text);
              // Pause briefly to prevent duplicate scans
              setTimeout(() => {
                if (readerRef.current && videoRef.current) {
                  readerRef.current.decodeFromVideoDevice(
                    selectedDeviceId!,
                    videoRef.current,
                    (result, error) => {
                      if (result) {
                        const text = result.getText();
                        if (/^\d{10}$/.test(text)) {
                          onScan(text);
                        }
                      }
                    }
                  );
                }
              }, 1000);
            }
          }
          if (error && !(error as any).name?.includes('NotFoundException')) {
            console.warn('Scan error:', error);
          }
        }
      );
    } catch (err) {
      console.error('Error starting scan:', err);
      setError('Failed to start camera');
      setIsScanning(false);
      if (onError) onError(err as Error);
    }
  }, [selectedDeviceId, onScan, onError]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setIsScanning(false);
  }, []);

  // Initialize when component mounts and isActive becomes true
  useEffect(() => {
    if (isActive) {
      getCameras();
    } else {
      stopScanning();
    }
  }, [isActive, getCameras, stopScanning]);

  // Start scanning when we have permission and device
  useEffect(() => {
    if (isActive && hasPermission && selectedDeviceId && !isScanning) {
      startScanning();
    }
  }, [isActive, hasPermission, selectedDeviceId, isScanning, startScanning]);

  const switchCamera = () => {
    if (devices.length > 1) {
      const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      setSelectedDeviceId(devices[nextIndex].deviceId);
    }
  };

  if (!isActive) {
    return (
      <div className={`flex items-center justify-center bg-slate-800 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <CameraOff className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400">Camera scanner inactive</p>
        </div>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <Card className={`bg-slate-800/50 border-slate-700 ${className}`}>
        <div className="p-6 text-center">
          <CameraOff className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-white font-medium mb-2">Camera Access Required</h3>
          <p className="text-slate-400 text-sm mb-4">
            Please allow camera access to scan student IDs
          </p>
          <Button 
            onClick={getCameras}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Camera className="h-4 w-4 mr-2" />
            Request Camera Access
          </Button>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-slate-800/50 border-slate-700 ${className}`}>
        <div className="p-6 text-center">
          <CameraOff className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-white font-medium mb-2">Camera Error</h3>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <Button 
            onClick={() => {
              setError(null);
              getCameras();
            }}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`bg-slate-800/50 border-slate-700 overflow-hidden ${className}`}>
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full h-64 object-cover bg-slate-900"
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

        {/* Camera controls */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between">
          <div className="flex gap-2">
            {devices.length > 1 && (
              <Button
                onClick={switchCamera}
                size="sm"
                variant="outline"
                className="bg-black/50 border-white/20 text-white hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-white text-sm">Scanning...</span>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <p className="text-slate-400 text-sm text-center">
          Point camera at student ID barcode
        </p>
      </div>
    </Card>
  );
}
