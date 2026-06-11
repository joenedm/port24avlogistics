import React, { useState, useRef } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Button } from '@/components/ui/button';
import { Edit2, Save, X, RefreshCw, GripVertical } from 'lucide-react';
import WidgetSlot from './WidgetSlot';
import WidgetLibrary from './WidgetLibrary';
import { WIDGET_REGISTRY, DEFAULT_LAYOUTS } from '@/lib/dashboardWidgetRegistry';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function useContainerWidth(ref) {
  const [width, setWidth] = useState(1200);
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(ref.current);
    setWidth(ref.current.offsetWidth);
    return () => ro.disconnect();
  }, []);
  return width;
}

export default function DashboardGrid({ userRole, initialLayout, onLayoutChange }) {
  const [layout, setLayout] = useState(initialLayout || DEFAULT_LAYOUTS[userRole] || []);
  const [editMode, setEditMode] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const containerRef = useRef(null);
  const gridWidth = useContainerWidth(containerRef);
  const queryClient = useQueryClient();

  const handleSync = async () => {
    setSyncing(true);
    try { await queryClient.invalidateQueries(); toast.success('All data refreshed'); }
    catch { toast.error('Refresh failed'); }
    finally { setSyncing(false); }
  };

  const handleLayoutChange = (newLayout) => {
    // Merge positions back — keep our w/h/i, update x/y from rgl
    setLayout(prev => prev.map(item => {
      const updated = newLayout.find(n => n.i === item.i);
      return updated ? { ...item, x: updated.x, y: updated.y, w: updated.w, h: updated.h } : item;
    }));
    setUnsavedChanges(true);
  };

  const handleAddWidget = (widgetId) => {
    if (layout.some(item => item.i === widgetId)) return;
    const widget = WIDGET_REGISTRY[widgetId];
    setLayout(prev => [...prev, {
      i: widgetId, x: 0,
      y: Math.max(...prev.map(it => it.y + it.h), 0),
      w: widget.defaultSize.w, h: widget.defaultSize.h,
    }]);
    setUnsavedChanges(true);
  };

  const handleRemoveWidget = (widgetId) => {
    setLayout(prev => prev.filter(item => item.i !== widgetId));
    setUnsavedChanges(true);
  };

  const handleSave = () => { onLayoutChange(layout); setUnsavedChanges(false); setEditMode(false); };
  const handleCancel = () => { setLayout(initialLayout || DEFAULT_LAYOUTS[userRole] || []); setUnsavedChanges(false); setEditMode(false); };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2 px-2 flex-wrap">
        <button onClick={handleSync} disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
          <RefreshCw className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} />
          {syncing ? 'Syncing...' : 'Sync'}
        </button>
        <Button variant={editMode ? 'default' : 'outline'} size="sm" onClick={() => setEditMode(e => !e)} className="gap-2">
          <Edit2 className="w-4 h-4" />{editMode ? 'Exit Edit' : 'Edit Dashboard'}
        </Button>
        {editMode && <>
          <Button variant="outline" size="sm" onClick={() => setShowLibrary(true)}>+ Add Widget</Button>
          <Button variant="outline" size="sm" onClick={() => { setLayout(DEFAULT_LAYOUTS[userRole] || []); setUnsavedChanges(true); }}>Reset</Button>
        </>}
        {editMode && unsavedChanges && <>
          <Button variant="outline" size="sm" onClick={handleCancel} className="gap-2"><X className="w-4 h-4" />Cancel</Button>
          <Button size="sm" onClick={handleSave} className="gap-2"><Save className="w-4 h-4" />Save</Button>
        </>}
      </div>

      {/* Grid */}
      <div ref={containerRef} className="px-2">
        <GridLayout
          layout={layout}
          cols={12}
          rowHeight={80}
          width={gridWidth}
          margin={[12, 12]}
          containerPadding={[0, 0]}
          isDraggable={editMode}
          isResizable={editMode}
          draggableHandle=".widget-drag-handle"
          compactType="vertical"
          preventCollision={false}
          useCSSTransforms
          onLayoutChange={handleLayoutChange}
        >
          {layout.map(item => (
            <div key={item.i} className={cn(
              'bg-card rounded-lg border border-border shadow-sm flex flex-col overflow-hidden',
              editMode && 'ring-2 ring-primary/20 hover:ring-primary/40'
            )}>
              {/* Drag handle — only zone that triggers drag */}
              <div className={cn(
                'widget-drag-handle flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0',
                editMode ? 'cursor-grab active:cursor-grabbing bg-muted/20 select-none' : ''
              )}>
                <div className="flex items-center gap-2">
                  {editMode && <GripVertical className="w-4 h-4 text-primary/50 shrink-0" />}
                  <span className="font-semibold text-sm">{WIDGET_REGISTRY[item.i]?.name ?? item.i}</span>
                </div>
                {editMode && (
                  <button
                    className="widget-no-drag h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => handleRemoveWidget(item.i)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {/* Content */}
              <div className={cn('flex-1 overflow-auto p-4', editMode && 'pointer-events-none select-none')}>
                <WidgetSlot widgetId={item.i} />
              </div>
            </div>
          ))}
        </GridLayout>
      </div>

      {showLibrary && (
        <WidgetLibrary
          currentLayout={layout}
          onAddWidget={(id) => { handleAddWidget(id); setShowLibrary(false); }}
          onClose={() => setShowLibrary(false)}
          userRole={userRole}
        />
      )}

      <style>{`
        .react-grid-item.react-grid-placeholder {
          background: hsl(var(--primary) / 0.15) !important;
          border: 2px dashed hsl(var(--primary) / 0.4) !important;
          border-radius: 8px !important;
          opacity: 1 !important;
        }
        .react-grid-item > .react-resizable-handle::after {
          border-color: hsl(var(--primary) / 0.5) !important;
        }
        .react-grid-item.react-draggable-dragging {
          box-shadow: 0 20px 60px rgba(0,0,0,0.4) !important;
          z-index: 100;
        }
      `}</style>
    </div>
  );
}
