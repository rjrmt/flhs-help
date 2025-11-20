'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ScanLine, X, RotateCcw } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface BarcodeScannerProps {
  onScanSuccess: (scannedId: string) => void;
  onClose?: () => void;
  placeholder?: string;
  className?: string;
  showInput?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function BarcodeScanner({
  onScanSuccess,
  onClose,
  placeholder = "Scan ID or Type...",
  className = "",
  showInput = true,
  autoFocus = true,
  disabled = false,
}: BarcodeScannerProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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

  // Auto-focus input when component mounts
  useEffect(() => {
    if (autoFocus && inputRef.current && showInput) {
      inputRef.current.focus();
    }
  }, [autoFocus, showInput]);

  // Auto-process on 10 digits
  useEffect(() => {
    if (inputValue.length === 10 && /^\d{10}$/.test(inputValue)) {
      onScanSuccess(inputValue);
    }
  }, [inputValue, onScanSuccess]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setInputValue(value);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.length === 10) {
      onScanSuccess(inputValue);
    }
  };

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
            const text = result.getText().trim();
            console.log('Barcode detected:', text);
            
            // Handle different barcode formats
            let studentId = text;
            
            // If it's a longer barcode, try to extract student ID
            if (text.length > 10) {
              // Look for 10-digit sequences in the barcode
              const match = text.match(/\d{10}/);
              if (match) {
                studentId = match[0];
              }
            }
            
            // Only process if it looks like a student ID (10 digits)
            if (/^\d{10}$/.test(studentId)) {
              console.log('Valid student ID found:', studentId);
              handleScannerSuccess(studentId);
            } else {
              console.log('Invalid barcode format:', text);
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

  const handleScannerSuccess = (scannedId: string) => {
    setInputValue(scannedId);
    setScanSuccess(true);
    
    // Add visual feedback
    if (readerRef.current) {
      readerRef.current.reset();
    }
    
    // Show success animation briefly
    setTimeout(() => {
      setShowScanner(false);
      setScanSuccess(false);
      // Auto-process the scanned ID
      setTimeout(() => {
        onScanSuccess(scannedId);
      }, 100);
    }, 1000);
  };

  const switchCamera = () => {
    if (devices.length > 1) {
      const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      setSelectedDeviceId(devices[nextIndex].deviceId);
    }
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
    if (readerRef.current) {
      readerRef.current.reset();
    }
    onClose?.();
  };

  const handleOpenScanner = () => {
    setShowScanner(true);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {showInput && !showScanner && (
        <div className="relative">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            inputMode="numeric"
            pattern="[0-9]*"
            className="w-full rounded-xl border-2 border-white/20 bg-white/10 backdrop-blur-sm px-6 py-4 text-white placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/20 text-lg font-mono text-center shadow-lg transition-all duration-200"
            disabled={disabled}
          />
          
          {/* Barcode Scanner Button */}
          <button
            onClick={handleOpenScanner}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 hover:bg-white/20 rounded-xl transition-all duration-200 shadow-lg backdrop-blur-sm bg-white/10"
            disabled={disabled}
            title="Open Camera Scanner"
          >
            <ScanLine className="h-6 w-6 text-red-400" />
          </button>
          
          {/* Input validation indicator */}
          {inputValue.length > 0 && (
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <div className={`w-3 h-3 rounded-full ${
                inputValue.length === 10 ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
              }`}></div>
            </div>
          )}
        </div>
      )}

      {showScanner && (
        <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl">
          <video
            ref={videoRef}
            className="w-full h-80 object-cover"
            autoPlay
            playsInline
            muted
          />
          
          {/* Professional scanning overlay */}
          <div className="absolute inset-0">
            {/* Dark overlay with scanning window */}
            <div className="absolute inset-0 bg-black/40">
              {/* Scanning window */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className={`w-64 h-40 border-2 rounded-lg bg-transparent relative transition-all duration-300 ${
                  scanSuccess ? 'border-green-500 bg-green-500/10' : 'border-red-500'
                }`}>
                  {/* Corner brackets */}
                  <div className={`absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 ${
                    scanSuccess ? 'border-green-500' : 'border-red-500'
                  }`}></div>
                  <div className={`absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 ${
                    scanSuccess ? 'border-green-500' : 'border-red-500'
                  }`}></div>
                  <div className={`absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 ${
                    scanSuccess ? 'border-green-500' : 'border-red-500'
                  }`}></div>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 ${
                    scanSuccess ? 'border-green-500' : 'border-red-500'
                  }`}></div>
                  
                  {/* Animated scanning line */}
                  {!scanSuccess && (
                    <div className="absolute inset-0 overflow-hidden rounded-lg">
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
              
              {/* Instructions */}
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-center">
                <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2">
                  {scanSuccess ? (
                    <p className="text-green-400 text-sm font-medium">✓ Barcode scanned successfully!</p>
                  ) : (
                    <>
                      <p className="text-white text-sm font-medium">Position barcode within the frame</p>
                      <p className="text-red-300 text-xs">Hold steady for automatic scanning</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Close scanner button */}
          <button
            onClick={handleCloseScanner}
            className="absolute top-4 right-4 p-3 bg-black/70 backdrop-blur-sm rounded-full hover:bg-black/90 transition-all duration-200 shadow-lg"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          
          {/* Camera controls */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
            <div className="flex gap-2">
              {devices.length > 1 && (
                <button
                  onClick={switchCamera}
                  className="p-3 bg-black/70 backdrop-blur-sm rounded-full hover:bg-black/90 transition-all duration-200 shadow-lg"
                  title="Switch Camera"
                >
                  <RotateCcw className="h-4 w-4 text-white" />
                </button>
              )}
            </div>
            
            {/* Scanning status */}
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
              <div className="relative">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75"></div>
              </div>
              <span className="text-white text-sm font-medium">Scanning...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}