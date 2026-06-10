import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ZoomIn, ZoomOut, Maximize2, Minimize2, Move, RotateCcw, ChevronDown
} from 'lucide-react';

const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200];
const MIN_ZOOM = 25;
const MAX_ZOOM = 400;

/**
 * ScalableWorkspace — reusable zoomable/pannable canvas container.
 *
 * Props:
 *   children            — the canvas content (rendered at 1x, scaled via CSS transform)
 *   className           — wrapper className
 *   canvasWidth         — logical width of the inner canvas (px) — used for "fit" calculations
 *   canvasHeight        — logical height of the inner canvas (px)
 *   defaultZoom         — initial zoom % (default 100)
 *   storageKey          — localStorage key to persist zoom level
 *   extraControls       — additional buttons rendered inside the control bar
 *   onFullscreenChange  — callback(isFullscreen)
 */
export default function ScalableWorkspace({
  children,
  className,
  canvasWidth = 800,
  canvasHeight = 400,
  defaultZoom = 100,
  storageKey,
  extraControls,
  onFullscreenChange,
}) {
  const [zoom, setZoom] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(`zoom_${storageKey}`);
      if (saved) return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(saved)));
    }
    return defaultZoom;
  });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const containerRef = useRef(null);
  const panStart = useRef(null);

  const persistZoom = useCallback((z) => {
    if (storageKey) localStorage.setItem(`zoom_${storageKey}`, z);
  }, [storageKey]);

  const applyZoom = useCallback((newZoom) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    setZoom(clamped);
    persistZoom(clamped);
  }, [persistZoom]);

  // Fit to container viewport
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const zx = (clientWidth / canvasWidth) * 100;
    const zy = (clientHeight / canvasHeight) * 100;
    const fit = Math.floor(Math.min(zx, zy) * 0.92);
    applyZoom(fit);
    setPan({ x: 0, y: 0 });
  }, [canvasWidth, canvasHeight, applyZoom]);

  // Reset
  const resetZoom = useCallback(() => {
    applyZoom(100);
    setPan({ x: 0, y: 0 });
  }, [applyZoom]);

  // Mouse wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -10 : 10;
        setZoom(prev => {
          const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
          persistZoom(next);
          return next;
        });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [persistZoom]);

  // Pan via middle-mouse or space+drag
  const onMouseDown = useCallback((e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  }, [pan]);

  const onMouseMove = useCallback((e) => {
    if (!isPanning || !panStart.current) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, [isPanning]);

  const onMouseUp = useCallback(() => {
    setIsPanning(false);
    panStart.current = null;
  }, []);

  // Touch pinch-to-zoom
  const lastTouchDist = useRef(null);
  const onTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastTouchDist.current !== null) {
        const delta = (dist - lastTouchDist.current) * 0.5;
        setZoom(prev => {
          const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
          persistZoom(next);
          return next;
        });
      }
      lastTouchDist.current = dist;
    }
  }, [persistZoom]);

  const onTouchEnd = useCallback(() => {
    lastTouchDist.current = null;
  }, []);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    const next = !isFullscreen;
    setIsFullscreen(next);
    onFullscreenChange?.(next);
    // Fit to screen after a tick so the element has resized
    setTimeout(fitToScreen, 100);
  }, [isFullscreen, onFullscreenChange, fitToScreen]);

  const zoomPct = Math.round(zoom);
  const scale = zoom / 100;

  return (
    <div
      className={cn(
        "flex flex-col",
        isFullscreen
          ? "fixed inset-0 z-50 bg-background"
          : "relative",
        className
      )}
    >
      {/* Control bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/40 border-b border-border flex-shrink-0 flex-wrap gap-y-1">
        {/* Zoom controls */}
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => applyZoom(zoom - 10)} title="Zoom Out">
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>

        {/* Zoom % picker */}
        <div className="relative">
          <button
            className="flex items-center gap-1 h-7 px-2 text-xs font-mono rounded hover:bg-muted border border-border min-w-[52px] justify-center"
            onClick={() => setShowPresets(v => !v)}
          >
            {zoomPct}%
            <ChevronDown className="w-3 h-3" />
          </button>
          {showPresets && (
            <div className="absolute top-8 left-0 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
              {ZOOM_PRESETS.map(p => (
                <button key={p}
                  className={cn("w-full text-left px-3 py-1.5 text-sm hover:bg-muted", p === zoomPct && "text-primary font-semibold")}
                  onClick={() => { applyZoom(p); setShowPresets(false); }}>
                  {p}%
                </button>
              ))}
              <div className="border-t my-1" />
              <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                onClick={() => { fitToScreen(); setShowPresets(false); }}>
                Fit to Screen
              </button>
              <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                onClick={() => { resetZoom(); setShowPresets(false); }}>
                Reset (100%)
              </button>
            </div>
          )}
        </div>

        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => applyZoom(zoom + 10)} title="Zoom In">
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>

        <div className="w-px h-5 bg-border mx-0.5" />

        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={fitToScreen} title="Fit to Screen">
          <Move className="w-3.5 h-3.5 mr-1" /> Fit
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={resetZoom} title="Reset Zoom">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
        </Button>

        <div className="w-px h-5 bg-border mx-0.5" />

        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </Button>

        {extraControls && (
          <>
            <div className="w-px h-5 bg-border mx-0.5" />
            {extraControls}
          </>
        )}

        <div className="ml-2 text-[10px] text-muted-foreground hidden sm:block">
          Ctrl+scroll to zoom · Alt+drag to pan · Right-click item to rotate
        </div>
      </div>

      {/* Canvas viewport */}
      <div
        ref={containerRef}
        className={cn(
          "flex-1 overflow-hidden relative select-none",
          isPanning ? "cursor-grabbing" : "cursor-default"
        )}
        style={{ minHeight: isFullscreen ? undefined : 300 }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => setShowPresets(false)}
      >
        {/* Scaled inner canvas */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'top left',
            width: canvasWidth,
            height: canvasHeight,
            position: 'absolute',
            top: 0,
            left: 0,
            willChange: 'transform',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}