import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { X, Camera, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CameraScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectorRef = useRef(null);
  const activeRef = useRef(true);
  const [error, setError] = useState(null);
  const [hint, setHint] = useState('Point camera at QR code or barcode');

  const stopCamera = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const handleFound = useCallback((data) => {
    stopCamera();
    onScan(data.trim());
  }, [onScan, stopCamera]);

  useEffect(() => {
    activeRef.current = true;

    // Use native BarcodeDetector if available (supports QR + all barcode formats)
    if ('BarcodeDetector' in window) {
      try {
        detectorRef.current = new window.BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'data_matrix', 'pdf417', 'aztec'],
        });
        setHint('Point camera at any QR code or barcode');
      } catch {
        detectorRef.current = null;
      }
    }

    const tick = async () => {
      if (!activeRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        // Try native BarcodeDetector first (faster, supports all formats)
        if (detectorRef.current) {
          try {
            const codes = await detectorRef.current.detect(video);
            if (codes.length > 0 && codes[0].rawValue) {
              handleFound(codes[0].rawValue);
              return;
            }
          } catch {
            // fall through to jsQR
          }
        }

        // Fallback: jsQR for QR codes
        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code?.data) {
            handleFound(code.data);
            return;
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (!activeRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access and try again.');
        } else {
          setError('Camera unavailable. Please type the code manually.');
        }
      }
    };

    startCamera();

    return () => {
      activeRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [handleFound]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="relative bg-card rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Camera className="w-4 h-4 text-primary" />
            <span>{hint}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera View */}
        <div className="relative bg-black" style={{ aspectRatio: '1 / 1' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scan frame overlay */}
          {!error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Dimmed corners */}
              <div className="absolute inset-0 bg-black/30" style={{
                WebkitMaskImage: 'radial-gradient(ellipse 55% 55% at 50% 50%, transparent 100%, black 100%)',
                maskImage: 'radial-gradient(ellipse 55% 55% at 50% 50%, transparent 100%, black 100%)',
              }} />
              {/* Corner brackets */}
              <div className="w-52 h-52 relative">
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-lg" />
                {/* Animated scan line */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/80 animate-[scan_2s_ease-in-out_infinite]"
                  style={{ animation: 'scanline 2s ease-in-out infinite' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white text-sm text-center px-6 gap-3">
              <Camera className="w-8 h-8 opacity-50" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Tip */}
        {!error && (
          <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground bg-card/80">
            <Zap className="w-3 h-3 text-primary" />
            Hold steady — scans automatically when code is detected
          </div>
        )}

        <div className="p-3">
          <Button variant="outline" className="w-full" onClick={onClose}>Cancel</Button>
        </div>
      </div>

      <style>{`
        @keyframes scanline {
          0% { top: 0%; opacity: 1; }
          50% { top: calc(100% - 2px); opacity: 0.7; }
          100% { top: 0%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}