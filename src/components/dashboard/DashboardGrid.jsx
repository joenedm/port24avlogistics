import React, { useState, useRef } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Edit2, Save, X, RefreshCw, GripVertical } from 'lucide-react';
import WidgetSlot from './WidgetSlot';
import WidgetLibrary from './WidgetLibrary';
import { WIDGET_REGISTRY, DEFAULT_LAYOUTS } from '@/lib/dashboardWidgetRegistry';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function colSpan(w) {
  if (w >= 12) return 'col-span-12';
  if (w >= 9)  return 'col-span-9';
  if (w >= 8)  return 'col-span-8';
  if (w >= 6)  return 'col-span-6';
  if (w >= 4)  return 'col-span-4';
  return 'col-span-3';
}

function SortableWidget({ item, editMode, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.i });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        minHeight: `${item.h * 80}px`,
      }}
      className={cn(
        colSpan(item.w),
        'bg-card rounded-lg border border-border shadow-sm flex flex-col',
        editMode && 'ring-2 ring-primary/20',
        isDragging && 'opacity-30 border-dashed border-primary/50'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-3 border-b border-border shrink-0 rounded-t-lg',
          editMode && 'cursor-grab active:cursor-grabbing select-none bg-muted/30'
        )}
        {...(editMode ? { ...attributes, ...listeners } : {})}
      >
        <div className="flex items-center gap-2">
          {editMode && <GripVertical className="w-4 h-4 text-primary/60 shrink-0" />}
          <span className="font-semibold text-sm">{WIDGET_REGISTRY[item.i]?.name ?? item.i}</span>
        </div>
        {editMode && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={onRemove}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className={cn('flex-1 overflow-auto p-4', editMode && 'pointer-events-none select-none')}>
        <WidgetSlot widgetId={item.i} />
      </div>
    </div>
  );
}

export default function DashboardGrid({ userRole, initialLayout, onLayoutChange }) {
  const [layout, setLayout] = useState(initialLayout || DEFAULT_LAYOUTS[userRole] || []);
  const [editMode, setEditMode] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const queryClient = useQueryClient();
  const gridRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      await queryClient.invalidateQueries();
      toast.success('All data refreshed');
    } catch {
      toast.error('Refresh failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleDragStart = ({ active }) => setActiveId(active.id);

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setLayout(prev => {
      const oldIndex = prev.findIndex(i => i.i === active.id);
      const newIndex = prev.findIndex(i => i.i === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
    setUnsavedChanges(true);
  };

  const handleDragCancel = () => setActiveId(null);

  const handleAddWidget = (widgetId) => {
    if (layout.some(item => item.i === widgetId)) return;
    const widget = WIDGET_REGISTRY[widgetId];
    setLayout(prev => [...prev, { i: widgetId, x: 0, y: 999, w: widget.defaultSize.w, h: widget.defaultSize.h }]);
    setUnsavedChanges(true);
  };

  const handleRemoveWidget = (widgetId) => {
    setLayout(prev => prev.filter(item => item.i !== widgetId));
    setUnsavedChanges(true);
  };

  const handleSave = () => {
    onLayoutChange(layout);
    setUnsavedChanges(false);
    setEditMode(false);
  };

  const handleCancel = () => {
    setLayout(initialLayout || DEFAULT_LAYOUTS[userRole] || []);
    setUnsavedChanges(false);
    setEditMode(false);
  };

  const activeItem = layout.find(i => i.i === activeId);

  // Measure actual pixel width of one grid column for the overlay
  const getOverlayWidth = (w) => {
    if (!gridRef.current) return 'auto';
    const gridWidth = gridRef.current.offsetWidth;
    const gap = 12; // gap-3 = 12px
    const colWidth = (gridWidth - gap * 11) / 12;
    return `${colWidth * w + gap * (w - 1)}px`;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2 px-2 flex-wrap">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} />
          {syncing ? 'Syncing...' : 'Sync'}
        </button>

        <Button variant={editMode ? 'default' : 'outline'} size="sm" onClick={() => setEditMode(e => !e)} className="gap-2">
          <Edit2 className="w-4 h-4" />
          {editMode ? 'Exit Edit' : 'Edit Dashboard'}
        </Button>

        {editMode && (
          <>
            <Button variant="outline" size="sm" onClick={() => setShowLibrary(true)}>+ Add Widget</Button>
            <Button variant="outline" size="sm" onClick={() => { setLayout(DEFAULT_LAYOUTS[userRole] || []); setUnsavedChanges(true); }}>Reset</Button>
          </>
        )}

        {editMode && unsavedChanges && (
          <>
            <Button variant="outline" size="sm" onClick={handleCancel} className="gap-2">
              <X className="w-4 h-4" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" /> Save
            </Button>
          </>
        )}
      </div>

      {/* Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={layout.map(i => i.i)} strategy={verticalListSortingStrategy}>
          <div ref={gridRef} className="grid grid-cols-12 gap-3 px-2">
            {layout.map(item => (
              <SortableWidget
                key={item.i}
                item={item}
                editMode={editMode}
                onRemove={() => handleRemoveWidget(item.i)}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeItem && (
            <div
              style={{ width: getOverlayWidth(activeItem.w), minHeight: `${activeItem.h * 80}px` }}
              className="bg-card rounded-lg border-2 border-primary shadow-2xl flex flex-col opacity-95 rotate-1"
            >
              <div className="flex items-center gap-2 px-3 py-3 border-b border-border bg-muted/30 rounded-t-lg">
                <GripVertical className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">{WIDGET_REGISTRY[activeItem.i]?.name}</span>
              </div>
              <div className="flex-1 p-4 opacity-40">
                <WidgetSlot widgetId={activeItem.i} />
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {showLibrary && (
        <WidgetLibrary
          currentLayout={layout}
          onAddWidget={(id) => { handleAddWidget(id); setShowLibrary(false); }}
          onClose={() => setShowLibrary(false)}
          userRole={userRole}
        />
      )}
    </div>
  );
}
