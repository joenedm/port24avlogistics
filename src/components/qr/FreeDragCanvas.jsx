import React, { useRef, useEffect, useCallback, useState } from 'react';
import QRCode from 'qrcode';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const MM_TO_PX = 3.7795;

// Scale factor: how many screen pixels per mm
function getScale(size) {
  const maxW = 560;
  const maxH = 480;
  const scaleW = maxW / size.w;
  const scaleH = maxH / size.h;
  return Math.min(scaleW, scaleH, 6); // max 6x
}

export default function FreeDragCanvas({ elements, size, asset, brand, selectedId, onSelect, onUpdate, onDelete }) {
  const scale = getScale(size);
  const canvasW = Math.round(size.w * scale);
  const canvasH = Math.round(size.h * scale);

  const containerRef = useRef(null);
  const dragState = useRef(null); // { id, type: 'move'|'resize', startX, startY, origEl }

  const mmToScreen = (mm) => Math.round(mm * scale);
  const screenToMm = (px) => px / scale;

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const startDrag = useCallback((e, id, type, origEl) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(id);
    dragState.current = {
      id, type,
      startX: e.clientX,
      startY: e.clientY,
      origEl: { ...origEl },
    };

    const onMove = (me) => {
      if (!dragState.current) return;
      const dx = screenToMm(me.clientX - dragState.current.startX);
      const dy = screenToMm(me.clientY - dragState.current.startY);
      const orig = dragState.current.origEl;

      if (dragState.current.type === 'move') {
        const newX = clamp(orig.x + dx, 0, size.w - orig.w);
        const newY = clamp(orig.y + dy, 0, size.h - orig.h);
        onUpdate(id, { x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
      } else if (dragState.current.type === 'resize') {
        const newW = clamp(orig.w + dx, 4, size.w - orig.x);
        const newH = clamp(orig.h + dy, 4, size.h - orig.y);
        onUpdate(id, { w: Math.round(newW * 10) / 10, h: Math.round(newH * 10) / 10 });
      }
    };

    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onSelect, onUpdate, size, scale]);

  return (
    <div
      ref={containerRef}
      className="bg-white shadow-2xl border border-slate-300 relative select-none"
      style={{ width: canvasW, height: canvasH }}
      onClick={(e) => { if (e.target === containerRef.current) onSelect(null); }}
    >
      {elements.map(el => (
        <DraggableElement
          key={el.id}
          el={el}
          scale={scale}
          asset={asset}
          brand={brand}
          isSelected={selectedId === el.id}
          onStartDrag={startDrag}
          onSelect={onSelect}
          onDelete={onDelete}
          onUpdate={onUpdate}
          canvasW={canvasW}
          canvasH={canvasH}
          size={size}
        />
      ))}
    </div>
  );
}

function DraggableElement({ el, scale, asset, brand, isSelected, onStartDrag, onSelect, onDelete, onUpdate, canvasW, canvasH, size }) {
  const qrRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);

  const x = Math.round(el.x * scale);
  const y = Math.round(el.y * scale);
  const w = Math.round(el.w * scale);
  const h = Math.round(el.h * scale);

  // Render QR
   useEffect(() => {
     if (el.type === 'qr' && qrRef.current) {
       const sz = Math.min(w, h);
       QRCode.toCanvas(qrRef.current, asset?.serial_numbers || asset?.serial_number || asset?.id || 'SAMPLE', {
         width: sz,
         margin: 0,
         color: { dark: '#000000', light: '#ffffff' },
       });
     }
   }, [el.type, w, h, asset]);

  // Focus input when editing starts
  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const handleDblClick = (e) => {
    if (el.type === 'text') { e.stopPropagation(); setEditing(true); }
  };

  const handleBlur = () => setEditing(false);

  let content = null;

  if (el.type === 'qr') {
    content = <canvas ref={qrRef} style={{ width: w, height: h, display: 'block' }} />;
  } else if (el.type === 'logo') {
    const url = el.logoUrl || brand?.logo_url || '';
    content = url
      ? <img src={url} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} alt="" />
      : <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs border border-dashed border-slate-300 rounded">Logo</div>;
  } else {
    let value = '';
    if (el.type === 'text') value = el.value || 'Label Text';
    else if (el.field) value = asset?.[el.field] || `(${el.field})`;
    const fontSize = Math.round((el.fontSize || 8) * scale * 0.35);

    if (editing && el.type === 'text') {
      content = (
        <input
          ref={inputRef}
          value={el.value || ''}
          onChange={e => onUpdate(el.id, { value: e.target.value })}
          onBlur={handleBlur}
          onKeyDown={e => { if (e.key === 'Enter') setEditing(false); e.stopPropagation(); }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', height: '100%', fontSize, fontWeight: el.fontWeight || 'normal', background: 'transparent', outline: 'none', border: 'none', padding: 0, fontFamily: 'sans-serif' }}
        />
      );
    } else {
      content = (
        <div
          style={{
            fontSize,
            fontWeight: el.fontWeight || 'normal',
            fontFamily: el.mono ? 'monospace' : 'sans-serif',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: '#000',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {value}
        </div>
      );
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        cursor: 'move',
        boxSizing: 'border-box',
        outline: isSelected ? '2px solid #3b82f6' : '1px solid transparent',
        outlineOffset: 1,
      }}
      onClick={e => { e.stopPropagation(); onSelect(el.id); }}
      onDoubleClick={handleDblClick}
      onMouseDown={e => onStartDrag(e, el.id, 'move', el)}
    >
      {content}

      {/* Delete button */}
      {isSelected && (
        <button
          style={{ position: 'absolute', top: -10, right: -10, zIndex: 10, lineHeight: 0 }}
          className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete(el.id); }}
          title="Delete"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Resize handle */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            bottom: -5,
            right: -5,
            width: 12,
            height: 12,
            cursor: 'se-resize',
            background: '#3b82f6',
            borderRadius: 2,
            zIndex: 10,
          }}
          onMouseDown={e => { e.stopPropagation(); onStartDrag(e, el.id, 'resize', el); }}
        />
      )}
    </div>
  );
}