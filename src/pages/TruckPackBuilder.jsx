import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import html2canvas from 'html2canvas';
import { generateTruckPackHTML } from '@/lib/documentSettings';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Truck, Package, AlertTriangle, CheckCircle2, ArrowLeft,
  Printer, Trash2, MoveUp, MoveDown, RotateCcw,
  Lock, ChevronDown, ChevronUp, Save, RefreshCw,
  ArrowUpDown, X, Layers, Weight, Flag, Info, Maximize2, Minimize2,
  ZoomIn, ZoomOut, Move, RotateCw, Wand2, ExternalLink, GripVertical,
  ChevronsUp, ChevronsDown, CheckSquare
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const VEHICLE_PRESETS = {
  cargo_van:    { name: 'Cargo Van',       length: 96,  width: 60, height: 54,  door_w: 56, door_h: 50,  weight_cap: 3000 },
  sprinter_van: { name: 'Sprinter Van',    length: 144, width: 68, height: 70,  door_w: 60, door_h: 65,  weight_cap: 4000 },
  box_truck_12: { name: '12 ft Box Truck', length: 144, width: 90, height: 84,  door_w: 84, door_h: 80,  weight_cap: 6000 },
  box_truck_16: { name: '16 ft Box Truck', length: 192, width: 96, height: 84,  door_w: 90, door_h: 80,  weight_cap: 8000 },
  box_truck_24: { name: '24 ft Box Truck', length: 288, width: 96, height: 96,  door_w: 90, door_h: 90,  weight_cap: 14000 },
  trailer:      { name: 'Trailer',         length: 480, width: 96, height: 108, door_w: 92, door_h: 100, weight_cap: 40000 },
  custom:       { name: 'Custom',          length: 144, width: 84, height: 84,  door_w: 78, door_h: 80,  weight_cap: 6000 },
};

const FLAG_LABELS = {
  load_first:    { label: 'Load First',    color: 'text-emerald-500 bg-emerald-500/10', border: 'border-emerald-500/40' },
  load_last:     { label: 'Load Last',     color: 'text-amber-500 bg-amber-500/10',     border: 'border-amber-500/40' },
  cab_item:      { label: 'Cab Item',      color: 'text-blue-500 bg-blue-500/10',       border: 'border-blue-500/40' },
  keep_together: { label: 'Keep Together', color: 'text-purple-500 bg-purple-500/10',   border: 'border-purple-500/40' },
  fragile:       { label: 'Fragile',       color: 'text-red-500 bg-red-500/10',         border: 'border-red-500/40' },
};

const ITEM_COLORS = [
  { bg: 'rgba(31,184,160,0.45)',  border: 'rgba(31,184,160,0.8)'  },
  { bg: 'rgba(59,130,246,0.45)',  border: 'rgba(59,130,246,0.8)'  },
  { bg: 'rgba(16,185,129,0.45)',  border: 'rgba(16,185,129,0.8)'  },
  { bg: 'rgba(245,158,11,0.45)',  border: 'rgba(245,158,11,0.8)'  },
  { bg: 'rgba(168,85,247,0.45)',  border: 'rgba(168,85,247,0.8)'  },
  { bg: 'rgba(239,68,68,0.45)',   border: 'rgba(239,68,68,0.8)'   },
  { bg: 'rgba(20,184,166,0.45)',  border: 'rgba(20,184,166,0.8)'  },
  { bg: 'rgba(236,72,153,0.45)',  border: 'rgba(236,72,153,0.8)'  },
];

const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200];
const MIN_ZOOM = 20;
const MAX_ZOOM = 400;

// ─── Auto Layout ─────────────────────────────────────────────────────────────

function autoLayout(packItems, vehicle) {
  const PX_PER_IN = 3;
  const canvasW = vehicle.length * PX_PER_IN;
  const canvasH = vehicle.width * PX_PER_IN;

  const sorted = [...packItems].sort((a, b) => {
    if (a.flags?.includes('cab_item') && !b.flags?.includes('cab_item')) return 1;
    if (!a.flags?.includes('cab_item') && b.flags?.includes('cab_item')) return -1;
    if (a.flags?.includes('load_first') && !b.flags?.includes('load_first')) return -1;
    if (!a.flags?.includes('load_first') && b.flags?.includes('load_first')) return 1;
    if (a.flags?.includes('load_last') && !b.flags?.includes('load_last')) return 1;
    if (!a.flags?.includes('load_last') && b.flags?.includes('load_last')) return -1;
    const aW = Number(a.weight_lbs) || 0;
    const bW = Number(b.weight_lbs) || 0;
    if (bW !== aW) return bW - aW;
    if (!a.stackable && b.stackable) return -1;
    if (a.stackable && !b.stackable) return 1;
    return 0;
  });

  // Place items in a grid layout from front (right=high x%) to rear (left=low x%)
  // Load order #1 = loaded first = goes deepest = front of truck = high x%
  let curX = 85; // start from front (right side = high %)
  let curY = 5;
  let rowHeight = 0;
  const warnings = [];
  let totalWeight = 0;

  const placed = sorted.map((item, idx) => {
    const lenPct = Math.max(8, ((item.length_in || 24) / vehicle.length) * 90);
    const widPct = Math.max(10, ((item.width_in || 18) / vehicle.width) * 85);
    totalWeight += Number(item.weight_lbs) || 0;

    // If item doesn't fit in current row, wrap
    if (curX - lenPct < 5 && curY + rowHeight + widPct < 90) {
      curY += rowHeight + 2;
      curX = 85;
      rowHeight = 0;
    }

    const xPos = Math.max(5, Math.min(90 - lenPct, curX - lenPct));
    const yPos = Math.max(5, Math.min(85 - widPct, curY));

    curX = xPos - 2;
    rowHeight = Math.max(rowHeight, widPct);

    return { ...item, load_order: idx + 1, layer: 1, x_pos: xPos, y_pos: yPos };
  });

  if (totalWeight > (vehicle.weight_cap || Infinity))
    warnings.push(`⚠️ Estimated weight (${totalWeight} lbs) exceeds capacity (${vehicle.weight_cap} lbs)`);

  return { items: placed, warnings };
}

// ─── Truck Canvas ─────────────────────────────────────────────────────────────

// The canvas works in real inches. We scale the entire SVG/div to fit the zoom level.
// Items are positioned as percentages of truck length/width.

function TruckCanvas({ packItems, setPackItems, vehicle, zoom, selectedItemId, onSelectItem }) {
  // Canvas logical size in px (1px = 1 inch, scaled via zoom)
  const PX_PER_IN = 3; // base scale: 3px per inch at 100% zoom
  const canvasW = vehicle.length * PX_PER_IN;
  const canvasH = vehicle.width * PX_PER_IN;

  const handleItemMouseDown = useCallback((e, item) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onSelectItem(item.id);

    const scale = zoom / 100;
    const startX = e.clientX;
    const startY = e.clientY;

    const effW = item.rotated
      ? (item.width_in || 18) * PX_PER_IN
      : (item.length_in || 24) * PX_PER_IN;
    const effH = item.rotated
      ? (item.length_in || 24) * PX_PER_IN
      : (item.width_in || 18) * PX_PER_IN;

    // Capture start positions from item state — not from DOM
    const startXpx = ((item.x_pos ?? 5) / 100) * canvasW;
    const startYpx = ((item.y_pos ?? 5) / 100) * canvasH;

    let hasMoved = false;

    const onMove = (me) => {
      hasMoved = true;
      // Divide by CSS scale to convert screen px → logical canvas px
      const dx = (me.clientX - startX) / scale;
      const dy = (me.clientY - startY) / scale;
      const newXpx = Math.max(0, Math.min(canvasW - effW, startXpx + dx));
      const newYpx = Math.max(0, Math.min(canvasH - effH, startYpx + dy));
      setPackItems(prev => prev.map(p =>
        p.id === item.id
          ? { ...p, x_pos: (newXpx / canvasW) * 100, y_pos: (newYpx / canvasH) * 100 }
          : p
      ));
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      // If didn't move, it was a click — selection already set on mousedown
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [zoom, canvasW, canvasH, PX_PER_IN, setPackItems, onSelectItem]);

  const handleRotate = useCallback((e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setPackItems(prev => prev.map(p => p.id === item.id ? { ...p, rotated: !p.rotated } : p));
  }, [setPackItems]);

  return (
    <div
      id="truck-canvas-inner"
      className="relative bg-muted/20 border-2 border-border rounded-lg overflow-hidden"
      style={{ width: canvasW, height: canvasH }}
      onClick={() => onSelectItem(null)}
    >
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10" style={{ width: canvasW, height: canvasH }}>
        {Array.from({ length: Math.floor(vehicle.length / 24) }).map((_, i) => (
          <line key={`v${i}`} x1={(i + 1) * 24 * PX_PER_IN} y1={0} x2={(i + 1) * 24 * PX_PER_IN} y2={canvasH} stroke="currentColor" strokeWidth="1" />
        ))}
        {Array.from({ length: Math.floor(vehicle.width / 12) }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={(i + 1) * 12 * PX_PER_IN} x2={canvasW} y2={(i + 1) * 12 * PX_PER_IN} stroke="currentColor" strokeWidth="1" />
        ))}
      </svg>

      {/* Rear label */}
      <div className="absolute left-0 inset-y-0 w-8 flex items-center justify-center pointer-events-none">
        <span className="text-[9px] text-muted-foreground font-semibold -rotate-90 whitespace-nowrap">← REAR</span>
      </div>

      {/* Door indicator */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 bg-primary/20 border-l border-primary/40 rounded-l-md flex items-center justify-center pointer-events-none"
        style={{ height: Math.min(canvasH * 0.7, (vehicle.door_h || vehicle.height) / vehicle.width * canvasH) }}>
        <p className="text-[8px] text-primary font-bold rotate-90 whitespace-nowrap">DOOR</p>
      </div>

      {/* Front label */}
      <div className="absolute right-5 inset-y-0 w-8 flex items-center justify-center pointer-events-none">
        <span className="text-[9px] text-muted-foreground font-semibold -rotate-90 whitespace-nowrap">FRONT →</span>
      </div>

      {/* Pack items */}
      {packItems.map((item, i) => {
        const color = ITEM_COLORS[(item.load_order - 1) % ITEM_COLORS.length];
        const effLenPx = (item.rotated ? item.width_in || 18 : item.length_in || 24) * PX_PER_IN;
        const effWidPx = (item.rotated ? item.length_in || 24 : item.width_in || 18) * PX_PER_IN;
        // Positions must always be pre-assigned at add-time — never fall back to index-based calculation
        const xPct = item.x_pos ?? 5;
        const yPct = item.y_pos ?? 5;
        const xPx = (xPct / 100) * canvasW;
        const yPx = (yPct / 100) * canvasH;
        const isSelected = item.id === selectedItemId;

        // Detail level based on zoom
        const showBasic = zoom >= 40;
        const showNormal = zoom >= 80;
        const showFull = zoom >= 140;

        return (
          <div
            key={item.id}
            className={cn(
              "absolute rounded border-2 cursor-grab active:cursor-grabbing select-none flex flex-col items-center justify-start overflow-hidden transition-shadow",
              isSelected && "ring-2 ring-white ring-offset-1 ring-offset-transparent shadow-lg z-20"
            )}
            style={{
              left: xPx,
              top: yPx,
              width: effLenPx,
              height: effWidPx,
              backgroundColor: color.bg,
              borderColor: isSelected ? 'white' : color.border,
              zIndex: isSelected ? 20 : 10,
            }}
            onMouseDown={(e) => handleItemMouseDown(e, item)}
            onContextMenu={(e) => handleRotate(e, item)}
            title="Drag to move · Right-click to rotate · Click to inspect"
          >
            {/* Rotate button overlay on hover */}
            <button
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/30 hover:bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => handleRotate(e, item)}
              style={{ fontSize: 8, color: 'white', zIndex: 30, opacity: isSelected ? 1 : undefined }}
              title="Rotate"
            >
              ↺
            </button>

            {/* Load order badge */}
            {showBasic && (
              <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-black/40 flex items-center justify-center shrink-0">
                <span className="text-white font-bold" style={{ fontSize: Math.max(7, Math.min(11, effLenPx / 4)) }}>
                  {item.load_order}
                </span>
              </div>
            )}

            {/* Content */}
            <div className="w-full h-full flex flex-col items-center justify-center px-1 pb-1 pt-6">
              {showBasic && (
                <span className="text-white font-semibold text-center leading-tight w-full break-words"
                  style={{ fontSize: Math.max(7, Math.min(10, effLenPx / 8)), wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                  {item.name?.split(' ').slice(0, 3).join(' ')}
                </span>
              )}

              {showNormal && item.weight_lbs && (
                <span className="text-white/70 text-center leading-tight"
                  style={{ fontSize: Math.max(6, Math.min(9, effLenPx / 9)) }}>
                  {item.weight_lbs} lbs
                </span>
              )}

              {showFull && (
                <div className="w-full mt-0.5 space-y-0" style={{ fontSize: Math.max(6, Math.min(8, effLenPx / 10)) }}>
                  {item.room_name && (
                    <p className="text-white/60 truncate text-center">{item.room_name}</p>
                  )}
                  {item.department && (
                    <p className="text-white/60 truncate text-center">{item.department}</p>
                  )}
                  {item.flags?.map(f => FLAG_LABELS[f] && (
                    <span key={f} className="text-white/80 font-medium block text-center">{FLAG_LABELS[f].label}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Missing dims indicator */}
            {(!item.length_in || !item.width_in || !item.weight_lbs) && showBasic && (
              <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(239,68,68,0.85)' }}
                title="Missing size or weight">
                <span style={{ color: 'white', fontSize: 7, fontWeight: 'bold', lineHeight: 1 }}>!</span>
              </div>
            )}

            {/* Fragile / upright indicators */}
            {(item.fragile || item.must_stay_upright) && showBasic && (
              <div className="absolute bottom-0.5 right-0.5">
                <AlertTriangle style={{ width: Math.max(6, Math.min(10, effLenPx / 6)), height: Math.max(6, Math.min(10, effLenPx / 6)), color: 'rgba(251,191,36,0.9)' }} />
              </div>
            )}
          </div>
        );
      })}

      {packItems.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Truck className="w-12 h-12 mx-auto text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground/50">Add items to see layout</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pack Item Row ────────────────────────────────────────────────────────────

function PackItemRow({ item, index, total, onFlag, onRemove, onMoveUp, onMoveDown, onToggleLock, onSelect, isSelected, dragHandleProps, checked, onCheck }) {
  const [expanded, setExpanded] = useState(false);
  const color = ITEM_COLORS[(item.load_order - 1) % ITEM_COLORS.length];

  const missingSize = !item.length_in || !item.width_in;
  const missingWeight = !item.weight_lbs;
  const hasMissingDims = missingSize || missingWeight;
  const missingLabel = [missingSize && 'size', missingWeight && 'weight'].filter(Boolean).join(' & ');

  return (
    <div
      className={cn("border rounded-lg overflow-hidden transition-all cursor-pointer",
        isSelected ? "border-primary/60 bg-primary/5" : hasMissingDims ? "border-red-500/50 bg-red-500/5" : "border-border")}
      onClick={() => onSelect(item.id === isSelected ? null : item.id)}
    >
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/20">
        {/* Bulk checkbox */}
        <input
          type="checkbox"
          checked={checked}
          onChange={e => { e.stopPropagation(); onCheck(item.id, e.target.checked); }}
          onClick={e => e.stopPropagation()}
          className="w-3.5 h-3.5 shrink-0 accent-primary cursor-pointer"
        />
        {/* Drag handle */}
        <div {...dragHandleProps} className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 -ml-1" onClick={e => e.stopPropagation()}>
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
          style={{ backgroundColor: color.border }}>
          {item.load_order || '—'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {item.room_name && <span className="text-xs text-muted-foreground">{item.room_name}</span>}
            {item.department && <span className="text-xs text-muted-foreground">· {item.department}</span>}
            {item.weight_lbs
              ? <span className="text-xs text-muted-foreground">· {item.weight_lbs} lbs</span>
              : <span className="text-xs text-red-400">· no weight</span>
            }
            {missingSize && <span className="text-xs text-red-400">· no size</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasMissingDims && (
            <span title={`Missing ${missingLabel} — layout accuracy affected`}
              className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
              <AlertTriangle className="w-2.5 h-2.5" /> Fix dims
            </span>
          )}
          {item.is_permanent_case && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-primary/15 text-primary border border-primary/30">Perm Case</span>
          )}
          {item.is_suggested_container && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">Suggested</span>
          )}
          {item.flags?.map(f => FLAG_LABELS[f] && (
            <span key={f} className={cn("text-[9px] px-1 py-0.5 rounded font-medium", FLAG_LABELS[f].color)}>
              {FLAG_LABELS[f].label}
            </span>
          ))}
          {(item.fragile || item.must_stay_upright) && <AlertTriangle className="w-3 h-3 text-amber-400" />}
          {item.locked && <Lock className="w-3 h-3 text-muted-foreground" />}
          <button type="button" onClick={(e) => { e.stopPropagation(); setExpanded(x => !x); }}
            className="text-muted-foreground hover:text-foreground p-0.5 ml-1">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 py-3 bg-muted/10 border-t border-border space-y-2" onClick={e => e.stopPropagation()}>
          <div className="flex flex-wrap gap-1">
            {Object.entries(FLAG_LABELS).map(([flag, fl]) => (
              <button key={flag} type="button"
                onClick={() => onFlag(item.id, flag)}
                className={cn("text-xs px-2 py-1 rounded border transition-all",
                  item.flags?.includes(flag)
                    ? `${fl.color} ${fl.border}`
                    : 'border-border text-muted-foreground hover:border-muted-foreground/50')}>
                {fl.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onMoveUp(index)} disabled={index === 0}>
              <MoveUp className="w-3 h-3 mr-1" /> Up
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onMoveDown(index)} disabled={index === total - 1}>
              <MoveDown className="w-3 h-3 mr-1" /> Down
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onToggleLock(item.id)}>
              <Lock className="w-3 h-3 mr-1" /> {item.locked ? 'Unlock' : 'Lock'}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => onRemove(item.id)}>
              <Trash2 className="w-3 h-3 mr-1" /> Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Item Detail Panel ────────────────────────────────────────────────────────

function ItemDetailPanel({ item, containers, onClose, onFlag, onRemove }) {
  if (!item) return null;
  const container = containers.find(c => c.id === item.item_id);
  const missingSize = !item.length_in || !item.width_in;
  const missingWeight = !item.weight_lbs;
  const hasMissingDims = missingSize || missingWeight;

  return (
    <div className="w-72 border-l border-border bg-card flex flex-col shrink-0">
      <div className={cn("flex items-center justify-between px-4 py-3 border-b", hasMissingDims ? "border-red-500/40 bg-red-500/5" : "border-border")}>
        <div className="flex items-center gap-2 min-w-0">
          {hasMissingDims && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
          <h3 className="font-semibold text-sm truncate">{item.name}</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Missing dims alert banner */}
      {hasMissingDims && (
        <div className="mx-3 mt-3 p-3 rounded-lg border border-red-500/40 bg-red-500/10 space-y-1.5">
          <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Incomplete dimensions
          </p>
          <p className="text-[10px] text-muted-foreground">
            {[missingWeight && 'Weight is not set', missingSize && 'Size (L×W) is not set'].filter(Boolean).join(' · ')}
          </p>
          <p className="text-[10px] text-muted-foreground">This item will use default sizing on the layout canvas and may affect weight calculations.</p>
          {item.item_type === 'container' && (
            <a href="/containers" className="text-[10px] text-primary underline flex items-center gap-0.5 mt-1">
              Edit in Containers <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {/* Specs */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Specs</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Weight', item.weight_lbs ? `${item.weight_lbs} lbs` : null, missingWeight],
              ['Dimensions', item.length_in ? `${item.length_in}" × ${item.width_in}" × ${item.height_in || '?'}"` : null, missingSize],
              ['Load Order', `#${item.load_order}`, false],
              ['Department', item.department || '—', false],
              ['Room', item.room_name || '—', false],
              ['Layer', item.layer === 2 ? 'Stacked' : 'Floor', false],
            ].map(([k, v, isMissing]) => (
              <div key={k} className={cn("p-2 rounded", isMissing ? "bg-red-500/10 border border-red-500/30" : "bg-muted/30")}>
                <p className={cn("text-[10px]", isMissing ? "text-red-400" : "text-muted-foreground")}>{k}</p>
                <p className={cn("font-medium text-xs", isMissing ? "text-red-300" : "")}>{v || '— missing'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pack type badge */}
        {(item.is_permanent_case || item.is_suggested_container) && (
          <div className="flex items-center gap-2">
            {item.is_permanent_case && (
              <div className="flex-1 p-2 rounded-lg border border-primary/30 bg-primary/10 text-center">
                <p className="text-xs font-semibold text-primary">Permanent Case</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Always travels as a sealed unit</p>
              </div>
            )}
            {item.is_suggested_container && (
              <div className="flex-1 p-2 rounded-lg border border-amber-500/30 bg-amber-500/5 text-center">
                <p className="text-xs font-semibold text-amber-400">Suggested Container</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Loose items — may be repacked</p>
              </div>
            )}
          </div>
        )}

        {/* Properties */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Properties</p>
          {[
            ['Stackable', item.stackable],
            ['Fragile', item.fragile],
            ['Must Stay Upright', item.must_stay_upright],
            ['Locked', item.locked],
            ['Rotated', item.rotated],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">{k}</span>
              <span className={cn("text-xs font-medium", v ? "text-primary" : "text-muted-foreground/50")}>
                {v ? 'Yes' : 'No'}
              </span>
            </div>
          ))}
        </div>

        {/* Flags */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Flags</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(FLAG_LABELS).map(([flag, fl]) => (
              <button key={flag} type="button"
                onClick={() => onFlag(item.id, flag)}
                className={cn("text-xs px-2 py-1 rounded border transition-all",
                  item.flags?.includes(flag)
                    ? `${fl.color} ${fl.border}`
                    : 'border-border text-muted-foreground hover:border-muted-foreground/50')}>
                {fl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Container details from DB */}
        {container && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Container Details</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              {container.container_type && <p>Type: {container.container_type.replace('_', ' ')}</p>}
              {container.home_location && <p>Home: {container.home_location}</p>}
              {container.color_code && <p>Color: {container.color_code}</p>}
              {container.notes && <p className="italic">{container.notes}</p>}
            </div>
          </div>
        )}

        {item.notes && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
            <p className="text-xs text-muted-foreground">{item.notes}</p>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-border">
        <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive text-xs"
          onClick={() => { onRemove(item.id); onClose(); }}>
          <Trash2 className="w-3 h-3 mr-1.5" /> Remove from Pack
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TruckPackBuilder() {
  const { showId } = useParams();
  const queryClient = useQueryClient();

  const [vehicleType, setVehicleType] = useState('sprinter_van');
  const [customVehicle, setCustomVehicle] = useState({});
  const [packItems, setPackItems] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [packId, setPackId] = useState(null);
  const [addSearch, setAddSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('truckpack_zoom');
    return saved ? Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(saved))) : 75;
  });
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [showZoomPresets, setShowZoomPresets] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [loadOrderOpen, setLoadOrderOpen] = useState(true);
  const [checkedItems, setCheckedItems] = useState(new Set());

  const canvasContainerRef = useRef(null);
  const panStartRef = useRef(null);

  const vehicle = { ...VEHICLE_PRESETS[vehicleType], ...customVehicle };
  const PX_PER_IN = 3;
  const canvasW = vehicle.length * PX_PER_IN;
  const canvasH = vehicle.width * PX_PER_IN;

  // ── Data ──
  const { data: show } = useQuery({
    queryKey: ['show', showId],
    queryFn: () => base44.entities.Show.filter({ id: showId }).then(r => r[0]),
    enabled: !!showId,
  });
  const { data: containers = [] } = useQuery({
    queryKey: ['containers'],
    queryFn: () => base44.entities.Container.list('-created_date', 2000),
  });
  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.filter({}, '-created_date', 5000),
  });
  const { data: existingPacks = [] } = useQuery({
    queryKey: ['truckPacks', showId],
    queryFn: () => base44.entities.TruckPack.filter({ show_id: showId }),
    enabled: !!showId,
  });

  // Show requirements for auto-populate
  const { data: showRequirements = [] } = useQuery({
    queryKey: ['showRequirements', showId],
    queryFn: () => base44.entities.ShowRequirement.filter({ show_id: showId }),
    enabled: !!showId,
  });

  // Load existing pack — restore exactly as saved, never re-sort or re-position
  const packLoaded = useRef(false);
  useEffect(() => {
    if (existingPacks.length > 0 && !packLoaded.current) {
      packLoaded.current = true;
      const pack = existingPacks[0];
      setPackId(pack.id);
      if (pack.vehicle_type) setVehicleType(pack.vehicle_type);
      if (pack.pack_items?.length > 0) {
        // Ensure every item has a stable position — if missing (old data), assign grid position
        const restored = pack.pack_items.map((item, idx) => ({
          ...item,
          x_pos: item.x_pos != null ? item.x_pos : 5 + (idx % 5) * 16,
          y_pos: item.y_pos != null ? item.y_pos : 5 + Math.floor(idx / 5) * 20,
        }));
        setPackItems(restored);
      }
      if (pack.warnings?.length > 0) setWarnings(pack.warnings);
    }
  }, [existingPacks]);

  // Save
  const saveMutation = useMutation({
    mutationFn: async () => {
      const tw = packItems.reduce((s, i) => s + (Number(i.weight_lbs) || 0), 0);
      const payload = {
        show_id: showId, show_name: show?.name || '',
        vehicle_type: vehicleType, vehicle_name: vehicle.name,
        pack_items: packItems, warnings,
        total_weight_lbs: tw, status: 'planned',
      };
      if (packId) return base44.entities.TruckPack.update(packId, payload);
      const created = await base44.entities.TruckPack.create(payload);
      setPackId(created.id);
      return created;
    },
    onSuccess: () => {
      toast.success('Truck pack saved');
      queryClient.invalidateQueries({ queryKey: ['truckPacks', showId] });
    },
  });

  // ── Zoom / Pan ──
  const applyZoom = useCallback((z) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    setZoom(clamped);
    localStorage.setItem('truckpack_zoom', clamped);
  }, []);

  const fitToScreen = useCallback(() => {
    if (!canvasContainerRef.current) return;
    const { clientWidth, clientHeight } = canvasContainerRef.current;
    const zx = (clientWidth / canvasW) * 100;
    const zy = (clientHeight / canvasH) * 100;
    const fit = Math.floor(Math.min(zx, zy) * 0.88);
    applyZoom(fit);
    setPan({ x: 20, y: 20 });
  }, [canvasW, canvasH, applyZoom]);

  // Wheel zoom
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        applyZoom(zoom + (e.deltaY > 0 ? -10 : 10));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom, applyZoom]);

  // Middle-mouse / alt+drag pan on the outer canvas container
  const onContainerMouseDown = useCallback((e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  }, [pan]);
  const onContainerMouseMove = useCallback((e) => {
    if (!isPanning || !panStartRef.current) return;
    setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
  }, [isPanning]);
  const onContainerMouseUp = useCallback(() => { setIsPanning(false); panStartRef.current = null; }, []);

  // Pinch zoom
  const lastTouchDist = useRef(null);
  const onTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (lastTouchDist.current !== null) applyZoom(zoom + (dist - lastTouchDist.current) * 0.5);
      lastTouchDist.current = dist;
    }
  }, [zoom, applyZoom]);

  // ── Pack operations ──
  // Only items assigned to this show are valid to add from the project picklist
  const showAssets = assets.filter(a => a.current_show_id === showId);
  const showContainers = containers.filter(c =>
    c.current_show_id === showId || c.current_truck_pack_id === packId
  );

  // Unavailable statuses — block these from being added
  const BLOCKED_STATUSES = ['maintenance', 'retired', 'lost'];

  const getItemStatus = (item, type) => {
    if (type === 'container') {
      if (item.status === 'repair') return { blocked: true, reason: 'In repair' };
      if (item.status === 'missing') return { blocked: true, reason: 'Missing' };
      if (packItems.find(p => p.item_id === item.id)) return { blocked: true, reason: 'Already in pack' };
      return { blocked: false };
    }
    if (item.item_type === 'cloud_kit') return { blocked: true, reason: 'Cloud kit — not packable' };
    if (BLOCKED_STATUSES.includes(item.status)) return { blocked: true, reason: item.status === 'maintenance' ? 'In repair' : item.status === 'retired' ? 'Retired' : 'Missing' };
    if (item.current_show_id && item.current_show_id !== showId) return { blocked: true, reason: 'Assigned to another project' };
    if (packItems.find(p => p.item_id === item.id)) return { blocked: true, reason: 'Already in pack' };
    return { blocked: false };
  };

  const q = addSearch.toLowerCase();
  const searchResults = addSearch.length > 1 ? [
    ...showContainers
      .filter(c => c.name?.toLowerCase().includes(q) || c.asset_number?.toLowerCase().includes(q))
      .map(c => ({ ...c, _type: 'container', _status: getItemStatus(c, 'container') })),
    ...showAssets
      .filter(a => a.name?.toLowerCase().includes(q) || a.asset_number?.toLowerCase().includes(q) || a.barcode?.toLowerCase().includes(q))
      .map(a => ({ ...a, _type: 'asset', _status: getItemStatus(a, 'asset') })),
  ].slice(0, 12) : [];

  const addToPackItem = (item) => {
    // Validate item
    if (item.item_type === 'cloud_kit') { toast.error('Cloud kits cannot be added to a truck pack.'); return; }
    if (item.status === 'maintenance') { toast.error('This item is currently in repair and cannot be packed.'); return; }
    if (item.status === 'retired') { toast.error('This item is retired and cannot be packed.'); return; }
    if (item.status === 'lost') { toast.error('This item is marked missing and cannot be packed.'); return; }
    if (item.current_show_id && item.current_show_id !== showId && item._type !== 'container') {
      toast.error('This item is already assigned to another project.'); return;
    }
    if (packItems.find(p => p.item_id === item.id)) {
      toast.error('This item is already in the pack.'); return;
    }

    const isContainer = item._type === 'container';

    // Assign a stable staggered initial position based on current pack length
    // Use a grid pattern so new items don't overlap — positions are in % of canvas
    const idx = packItems.length;
    const cols = 5;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    // Spread across the truck: start at 5% from left, step by ~16% per column
    // Truck is left=rear, right=front. Stagger within 5–85% horizontally, 5–80% vertically.
    const initX = 5 + (col * 16);
    const initY = 5 + (row * 20);

    const newItem = {
      id: `pi-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      item_id: item.id, item_type: isContainer ? 'container' : 'asset',
      name: item.name,
      weight_lbs: isContainer ? item.empty_weight_lbs : (item.weight_kg ? Math.round(item.weight_kg * 2.205) : ''),
      length_in: isContainer ? (item.outside_length_in || 24) : 24,
      width_in: isContainer ? (item.outside_width_in || 18) : 18,
      height_in: isContainer ? (item.outside_height_in || 18) : 18,
      stackable: isContainer ? item.stackable : true,
      fragile: isContainer ? item.fragile : false,
      must_stay_upright: isContainer ? item.must_stay_upright : false,
      room_name: item.current_sub_location_name || '',
      department: item.category || '',
      load_order: packItems.length + 1,
      layer: 1, flags: [], locked: false,
      rotated: false,
      // Stable position assigned once at add-time — never recalculated
      x_pos: Math.min(initX, 80),
      y_pos: Math.min(initY, 75),
    };
    setPackItems(prev => [...prev, newItem]);
    setAddSearch('');
    toast.success(`${item.name} added`);
  };

  const runAutoLayout = useCallback(() => {
    setPackItems(current => {
      const { items, warnings: w } = autoLayout([...current], vehicle);
      setWarnings(w);
      return items;
    });
    toast.success('Auto layout applied');
  }, [vehicle]);

  const toggleFlag = (itemId, flag) => {
    setPackItems(prev => prev.map(p => {
      if (p.id !== itemId) return p;
      const flags = p.flags || [];
      return { ...p, flags: flags.includes(flag) ? flags.filter(f => f !== flag) : [...flags, flag] };
    }));
  };

  // Always renumber based on array position — this is the single source of truth for load_order
  const renumber = (items) => items.map((item, idx) => ({ ...item, load_order: idx + 1 }));

  const removeItem = (itemId) => {
    setPackItems(prev => renumber(prev.filter(p => p.id !== itemId)));
    setSelectedItemId(null);
  };
  const moveUp = (i) => {
    if (i === 0) return;
    setPackItems(prev => {
      const items = [...prev];
      [items[i-1], items[i]] = [items[i], items[i-1]];
      return renumber(items);
    });
  };
  const moveDown = (i) => {
    setPackItems(prev => {
      if (i >= prev.length - 1) return prev;
      const items = [...prev];
      [items[i], items[i+1]] = [items[i+1], items[i]];
      return renumber(items);
    });
  };
  const toggleLock = (itemId) => setPackItems(prev => prev.map(p => p.id === itemId ? { ...p, locked: !p.locked } : p));

  // ── Bulk selection ──
  const toggleCheck = (itemId, val) => setCheckedItems(prev => {
    const next = new Set(prev);
    val ? next.add(itemId) : next.delete(itemId);
    return next;
  });
  const toggleCheckAll = () => {
    if (checkedItems.size === packItems.length) {
      setCheckedItems(new Set());
    } else {
      setCheckedItems(new Set(packItems.map(p => p.id)));
    }
  };
  const clearChecked = () => setCheckedItems(new Set());

  const bulkMoveToFront = () => {
    setPackItems(prev => {
      const sel = prev.filter(p => checkedItems.has(p.id));
      const rest = prev.filter(p => !checkedItems.has(p.id));
      return renumber([...sel, ...rest]);
    });
    clearChecked();
    toast.success(`${checkedItems.size} item${checkedItems.size !== 1 ? 's' : ''} moved to front`);
  };

  const bulkMoveToBack = () => {
    setPackItems(prev => {
      const sel = prev.filter(p => checkedItems.has(p.id));
      const rest = prev.filter(p => !checkedItems.has(p.id));
      return renumber([...rest, ...sel]);
    });
    clearChecked();
    toast.success(`${checkedItems.size} item${checkedItems.size !== 1 ? 's' : ''} moved to back`);
  };

  const bulkRemove = () => {
    setPackItems(prev => renumber(prev.filter(p => !checkedItems.has(p.id))));
    setSelectedItemId(null);
    const count = checkedItems.size;
    clearChecked();
    toast.success(`${count} item${count !== 1 ? 's' : ''} removed`);
  };

  const onDragEnd = useCallback((result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    setPackItems(prev => {
      const items = [...prev];
      const [moved] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, moved);
      return renumber(items);
    });
  }, []);

  // ── Auto-populate from Show Equipment ──
  // Looks at all assets planned for this show (via requirements asset_id OR current_show_id),
  // finds their home_container_id, dedupes, then adds those containers to the pack.
  const autoPopulateFromShow = useCallback(() => {
    // Collect all asset IDs referenced in show requirements
    const reqAssetIds = new Set(showRequirements.map(r => r.asset_id).filter(Boolean));
    // Also include any asset currently assigned to this show
    const showAssignedAssets = assets.filter(a => a.current_show_id === showId);

    // Merge both sets
    const relevantAssets = [
      ...showAssignedAssets,
      ...assets.filter(a => reqAssetIds.has(a.id) && !showAssignedAssets.find(sa => sa.id === a.id)),
    ];

    if (relevantAssets.length === 0) {
      toast.error('No equipment found for this show. Add equipment via the Equipment tab first.');
      return;
    }

    // Collect unique container IDs, and for each track if ANY asset using it is permanent
    const containerPermanentMap = {};
    relevantAssets.forEach(a => {
      if (!a.home_container_id) return;
      if (!containerPermanentMap[a.home_container_id]) {
        containerPermanentMap[a.home_container_id] = false;
      }
      if (a.permanent_container) {
        containerPermanentMap[a.home_container_id] = true;
      }
    });
    const containerIds = Object.keys(containerPermanentMap);

    if (containerIds.length === 0) {
      toast.error('No containers assigned to this show\'s equipment. Assign containers to assets in the Equipment section.');
      return;
    }

    // Find those containers
    const containersToAdd = containerIds
      .map(id => containers.find(c => c.id === id))
      .filter(Boolean)
      .filter(c => !packItems.find(p => p.item_id === c.id)); // skip already-added

    if (containersToAdd.length === 0) {
      toast.info('All containers from this show\'s equipment are already in the pack.');
      return;
    }

    // Add them — tag permanent vs suggested
    const newItems = containersToAdd.map((c, i) => {
      const idx = packItems.length + i;
      const col = idx % 5;
      const row = Math.floor(idx / 5);
      const isPermanent = !!containerPermanentMap[c.id];
      return {
        id: `pi-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
        item_id: c.id, item_type: 'container',
        name: c.name,
        weight_lbs: c.empty_weight_lbs || '',
        length_in: c.outside_length_in || null,
        width_in: c.outside_width_in || null,
        height_in: c.outside_height_in || null,
        stackable: c.stackable !== false,
        fragile: c.fragile || false,
        must_stay_upright: c.must_stay_upright || false,
        department: c.category || '',
        room_name: '',
        load_order: idx + 1,
        layer: 1, flags: [], locked: false, rotated: false,
        x_pos: Math.min(5 + col * 16, 80),
        y_pos: Math.min(5 + row * 20, 75),
        // Permanent case = always travels as a unit; suggested = loose items that could be repacked
        is_permanent_case: isPermanent,
        is_suggested_container: !isPermanent,
      };
    });

    setPackItems(prev => renumber([...prev, ...newItems]));
    toast.success(`Added ${newItems.length} container${newItems.length !== 1 ? 's' : ''} from show equipment`);

    // Warn about containers with no dimensions
    const missingDims = containersToAdd.filter(c => !c.outside_length_in || !c.outside_width_in);
    if (missingDims.length > 0) {
      toast.warning(`${missingDims.length} container${missingDims.length !== 1 ? 's have' : ' has'} no dimensions set — edit them in Containers to fix layout sizing.`, { duration: 6000 });
    }
  }, [showRequirements, assets, containers, packItems, showId, renumber]);

  // Containers from show equipment that are missing dimensions
  const missingDimContainers = (() => {
    const reqAssetIds = new Set(showRequirements.map(r => r.asset_id).filter(Boolean));
    const relevantAssets = assets.filter(a => a.current_show_id === showId || reqAssetIds.has(a.id));
    const containerIds = [...new Set(relevantAssets.map(a => a.home_container_id).filter(Boolean))];
    return containerIds
      .map(id => containers.find(c => c.id === id))
      .filter(c => c && (!c.outside_length_in || !c.outside_width_in));
  })();

  const tw = packItems.reduce((s, i) => s + (Number(i.weight_lbs) || 0), 0);
  const overWeight = vehicle.weight_cap && tw > vehicle.weight_cap;
  const selectedItem = packItems.find(p => p.id === selectedItemId);

  const handlePrint = async () => {
    const canvasEl = document.getElementById('truck-canvas-inner');
    if (!canvasEl) { toast.error('Nothing to print'); return; }

    toast.info('Generating PDF…');
    try {
      // Capture canvas as image
      const captured = await html2canvas(canvasEl, {
        scale: 2,
        backgroundColor: '#0e1117',
        useCORS: true,
        logging: false,
      });
      const imgDataUrl = captured.toDataURL('image/png');

      // Load brand + doc settings
      const [brands, docSettingsList] = await Promise.all([
        base44.entities.BrandSettings.list().catch(() => []),
        base44.entities.DocumentSettings.list().catch(() => []),
      ]);
      const brand = brands[0] || null;
      const settings = docSettingsList[0] || {};

      const html = generateTruckPackHTML({
        pack: existingPacks[0] || null,
        show,
        vehicle,
        packItems,
        totalWeight: tw,
        imgDataUrl,
        settings,
        brand,
      });

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) {
        win.addEventListener('load', () => { setTimeout(() => win.print(), 400); });
      }
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };

  // ── Layout ──
  const scale = zoom / 100;

  return (
    <div className={cn("flex flex-col", isFullscreen ? "fixed inset-0 z-50 bg-background" : "h-[calc(100vh-80px)]")}>

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {showId && !isFullscreen && (
            <Link to={`/shows/${showId}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
          )}
          <Truck className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold leading-none">Truck Pack Builder</h1>
            {show && <p className="text-xs text-muted-foreground">{show.name}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Zoom controls */}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => applyZoom(zoom - 10)}><ZoomOut className="w-3.5 h-3.5" /></Button>
          <div className="relative">
            <button
              className="flex items-center gap-1 h-7 px-2 text-xs font-mono rounded hover:bg-muted border border-border min-w-[52px] justify-center"
              onClick={() => setShowZoomPresets(v => !v)}>
              {Math.round(zoom)}% <ChevronDown className="w-3 h-3" />
            </button>
            {showZoomPresets && (
              <div className="absolute top-8 left-0 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[130px]">
                {ZOOM_PRESETS.map(p => (
                  <button key={p}
                    className={cn("w-full text-left px-3 py-1.5 text-sm hover:bg-muted", p === Math.round(zoom) && "text-primary font-semibold")}
                    onClick={() => { applyZoom(p); setShowZoomPresets(false); }}>
                    {p}%
                  </button>
                ))}
                <div className="border-t my-1" />
                <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted" onClick={() => { fitToScreen(); setShowZoomPresets(false); }}>Fit to Screen</button>
                <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted" onClick={() => { applyZoom(100); setPan({ x: 20, y: 20 }); setShowZoomPresets(false); }}>Reset (100%)</button>
              </div>
            )}
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => applyZoom(zoom + 10)}><ZoomIn className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={fitToScreen}><Move className="w-3.5 h-3.5 mr-1" />Fit</Button>

          <div className="w-px h-5 bg-border" />


          {showId && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10" onClick={autoPopulateFromShow}>
              <Wand2 className="w-3.5 h-3.5" /> Auto-populate from Show
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print PDF
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="w-3.5 h-3.5 mr-1.5" /> {saveMutation.isPending ? 'Saving…' : 'Save Pack'}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsFullscreen(f => !f)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left panel — Vehicle + Add to Pack ── */}
        <div className={cn(
          "border-r border-border bg-card flex flex-col shrink-0 transition-all overflow-hidden",
          leftPanelOpen ? "w-72" : "w-10"
        )}>
          <button
            className="flex items-center justify-between px-3 py-2 border-b border-border hover:bg-muted/30 w-full text-left"
            onClick={() => setLeftPanelOpen(o => !o)}>
            {leftPanelOpen ? (
              <>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vehicle & Add to Pack</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </>
            ) : (
              <Truck className="w-4 h-4 text-muted-foreground mx-auto" />
            )}
          </button>

          {leftPanelOpen && (
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Vehicle */}
              <div className="space-y-2">
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(VEHICLE_PRESETS).map(([v, p]) => (
                      <SelectItem key={v} value={v}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[['Length', `${vehicle.length}"`], ['Width', `${vehicle.width}"`], ['Height', `${vehicle.height}"`],
                    ['Cap', `${vehicle.weight_cap?.toLocaleString()} lbs`]].map(([k, v]) => (
                    <div key={k} className="p-2 rounded bg-muted/30">
                      <p className="font-medium text-foreground">{v}</p>
                      <p className="text-muted-foreground">{k}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weight bar */}
              <div className={cn("p-3 rounded-lg border", overWeight ? "border-red-500/40 bg-red-500/5" : "border-border bg-muted/20")}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Weight</p>
                <div className="flex items-baseline gap-1">
                  <span className={cn("text-lg font-bold", overWeight ? "text-red-500" : "")}>{tw.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">/ {vehicle.weight_cap?.toLocaleString()} lbs</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-1.5 rounded-full transition-all", overWeight ? "bg-red-500" : "bg-primary")}
                    style={{ width: `${Math.min(100, (tw / (vehicle.weight_cap || 1)) * 100)}%` }} />
                </div>
                {overWeight && <p className="text-[10px] text-red-400 mt-1">Over by {(tw - vehicle.weight_cap).toLocaleString()} lbs</p>}
              </div>

              {warnings.length > 0 && (
                <div className="space-y-1">
                  {warnings.map((w, i) => <p key={i} className="text-xs text-amber-400 flex gap-1"><AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{w}</p>)}
                </div>
              )}

              {/* Missing dimensions warning */}
              {missingDimContainers.length > 0 && (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
                  <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> {missingDimContainers.length} container{missingDimContainers.length !== 1 ? 's' : ''} missing dimensions
                  </p>
                  <p className="text-[10px] text-muted-foreground">These containers have no size set — the layout canvas cannot size them accurately.</p>
                  <div className="space-y-1">
                    {missingDimContainers.map(c => (
                      <div key={c.id} className="flex items-center justify-between gap-1">
                        <span className="text-[10px] truncate text-amber-300">{c.name}</span>
                        <a href="/containers" className="text-[10px] text-primary underline shrink-0 flex items-center gap-0.5">
                          Fix <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add search */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add to Pack</p>
                <Input
                  placeholder="Search containers, assets…"
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  className="h-8 text-xs"
                />
                {searchResults.length > 0 && (
                  <div className="border rounded-lg divide-y bg-background max-h-60 overflow-y-auto">
                    {searchResults.map(item => {
                      const blocked = item._status?.blocked;
                      const reason = item._status?.reason;
                      return (
                        <button key={item.id} type="button"
                          disabled={blocked}
                          className={cn("w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors",
                            blocked ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/40")}
                          onClick={() => !blocked && addToPackItem(item)}
                          title={blocked ? reason : undefined}>
                          <Package className={cn("w-3 h-3 shrink-0", item._type === 'container' ? "text-primary" : "text-muted-foreground", blocked && "text-muted-foreground/40")} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {blocked ? reason : (item._type === 'container' ? (item.container_type || 'Container') : 'Asset')}
                            </p>
                          </div>
                          {item.empty_weight_lbs && !blocked && <span className="text-[10px] text-muted-foreground">{item.empty_weight_lbs}lb</span>}
                          {blocked
                            ? <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                            : <span className="text-[10px] text-primary shrink-0">+</span>
                          }
                        </button>
                      );
                    })}
                  </div>
                )}
                {addSearch.length > 1 && searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No project items match "{addSearch}"</p>
                )}
              </div>

              {vehicleType === 'custom' && (
                <div className="border-t pt-3 grid grid-cols-2 gap-2">
                  {[['Length (in)', 'length'], ['Width (in)', 'width'], ['Height (in)', 'height'], ['Weight Cap (lbs)', 'weight_cap']].map(([lbl, key]) => (
                    <div key={key}>
                      <Label className="text-[10px]">{lbl}</Label>
                      <Input type="number" className="h-7 text-xs" value={customVehicle[key] || ''}
                        onChange={e => setCustomVehicle(p => ({ ...p, [key]: Number(e.target.value) }))} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Canvas area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas viewport */}
          <div
            ref={canvasContainerRef}
            className={cn("flex-1 overflow-hidden relative", isPanning ? "cursor-grabbing" : "cursor-default")}
            style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 23px, hsl(var(--border)/0.3) 24px), repeating-linear-gradient(90deg, transparent, transparent 23px, hsl(var(--border)/0.3) 24px)' }}
            onMouseDown={onContainerMouseDown}
            onMouseMove={onContainerMouseMove}
            onMouseUp={onContainerMouseUp}
            onMouseLeave={onContainerMouseUp}
            onTouchMove={onTouchMove}
            onTouchEnd={() => { lastTouchDist.current = null; }}
            onClick={() => setShowZoomPresets(false)}
          >
            <div id="truck-pack-print-area" style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0, left: 0,
              willChange: 'transform',
            }}>
              <TruckCanvas
                packItems={packItems}
                setPackItems={setPackItems}
                vehicle={vehicle}
                zoom={zoom}
                selectedItemId={selectedItemId}
                onSelectItem={setSelectedItemId}
              />
            </div>

            {/* Hint overlay */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="bg-background/70 backdrop-blur-sm text-[10px] text-muted-foreground px-3 py-1.5 rounded-full border border-border">
                Ctrl+scroll to zoom · Alt+drag to pan · Right-click item to rotate · Click to inspect
              </div>
            </div>
          </div>

          {/* ── Load Order panel ── */}
          <div className="border-t border-border bg-card shrink-0" style={{ maxHeight: loadOrderOpen ? 320 : 36 }}>
            <button
              className="flex items-center justify-between w-full px-4 py-2 hover:bg-muted/30 text-left"
              onClick={() => setLoadOrderOpen(o => !o)}>
              <div className="flex items-center gap-2">
                {/* Select-all checkbox */}
                {loadOrderOpen && packItems.length > 0 && (
                  <input
                    type="checkbox"
                    checked={checkedItems.size === packItems.length && packItems.length > 0}
                    ref={el => { if (el) el.indeterminate = checkedItems.size > 0 && checkedItems.size < packItems.length; }}
                    onChange={e => { e.stopPropagation(); toggleCheckAll(); }}
                    onClick={e => e.stopPropagation()}
                    className="w-3.5 h-3.5 accent-primary cursor-pointer shrink-0"
                    title="Select all"
                  />
                )}
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Load Order — {packItems.length} item{packItems.length !== 1 ? 's' : ''} · {tw.toLocaleString()} lbs
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  onClick={(e) => { e.stopPropagation(); runAutoLayout(); }}>
                  <ArrowUpDown className="w-3 h-3" /> Auto Sort
                </button>
                {loadOrderOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
            </button>

            {/* Bulk action bar */}
            {loadOrderOpen && checkedItems.size > 0 && (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 border-b border-primary/20">
                <span className="text-xs font-semibold text-primary">{checkedItems.size} selected</span>
                <div className="flex items-center gap-1 ml-2">
                  <Button size="sm" variant="outline" className="h-6 text-xs px-2 border-primary/30 hover:bg-primary/10" onClick={bulkMoveToFront}>
                    <ChevronsUp className="w-3 h-3 mr-1" /> Move to Front
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-xs px-2 border-primary/30 hover:bg-primary/10" onClick={bulkMoveToBack}>
                    <ChevronsDown className="w-3 h-3 mr-1" /> Move to Back
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-destructive hover:text-destructive" onClick={bulkRemove}>
                    <Trash2 className="w-3 h-3 mr-1" /> Remove
                  </Button>
                </div>
                <button type="button" className="ml-auto text-muted-foreground hover:text-foreground" onClick={clearChecked}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {loadOrderOpen && (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="load-order">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn("overflow-y-auto px-4 pb-3 space-y-1.5 transition-colors", snapshot.isDraggingOver && "bg-primary/5")}
                      style={{ maxHeight: 240 }}
                    >
                      {packItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">Add containers and items to build your truck pack.</p>
                      ) : (
                        packItems.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={cn(dragSnapshot.isDragging && "opacity-90 shadow-xl ring-1 ring-primary/40 rounded-lg")}
                              >
                                <PackItemRow
                                  item={item} index={index} total={packItems.length}
                                  onFlag={toggleFlag} onRemove={removeItem}
                                  onMoveUp={moveUp} onMoveDown={moveDown}
                                  onToggleLock={toggleLock}
                                  onSelect={setSelectedItemId}
                                  isSelected={selectedItemId === item.id}
                                  dragHandleProps={dragProvided.dragHandleProps}
                                  checked={checkedItems.has(item.id)}
                                  onCheck={toggleCheck}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </div>

        {/* ── Right: Item Detail Panel ── */}
        {selectedItem && (
          <ItemDetailPanel
            item={selectedItem}
            containers={containers}
            onClose={() => setSelectedItemId(null)}
            onFlag={toggleFlag}
            onRemove={removeItem}
          />
        )}
      </div>
    </div>
  );
}