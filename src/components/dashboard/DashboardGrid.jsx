import React, { useState, useEffect } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Button } from '@/components/ui/button';
import { Edit2, Save, X, RefreshCw } from 'lucide-react';
import WidgetSlot from './WidgetSlot';
import WidgetLibrary from './WidgetLibrary';
import { WIDGET_REGISTRY, DEFAULT_LAYOUTS } from '@/lib/dashboardWidgetRegistry';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function DashboardGrid({ userRole, initialLayout, onLayoutChange }) {
  const [layout, setLayout] = useState(initialLayout || DEFAULT_LAYOUTS[userRole] || []);
  const [editMode, setEditMode] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [gridWidth, setGridWidth] = useState(typeof window !== 'undefined' ? Math.min(window.innerWidth - 320, 1400) : 1000);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const handleResize = () => {
      setGridWidth(Math.min(window.innerWidth - 320, 1400));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('cleanupOrphanedCheckouts', {});
      const { orphaned_count } = res.data;
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['shows'] });
      queryClient.invalidateQueries({ queryKey: ['fulfillments'] });
      queryClient.invalidateQueries({ queryKey: ['review-items'] });
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      if (orphaned_count > 0) {
        toast.success(`Synced — reset ${orphaned_count} orphaned checkout${orphaned_count !== 1 ? 's' : ''} back to Available`);
      } else {
        toast.success('All data is in sync');
      }
    } catch {
      toast.error('Sync failed — please try again');
    }
    setSyncing(false);
  };

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
    setUnsavedChanges(true);
  };

  const handleAddWidget = (widgetId) => {
    // Check if widget already exists
    if (layout.some(item => item.i === widgetId)) return;

    const widget = WIDGET_REGISTRY[widgetId];
    const newItem = {
      x: 0,
      y: Math.max(...layout.map(item => item.y + item.h), 0),
      w: widget.defaultSize.w,
      h: widget.defaultSize.h,
      i: widgetId
    };
    setLayout([...layout, newItem]);
    setUnsavedChanges(true);
  };

  const handleRemoveWidget = (widgetId) => {
    setLayout(layout.filter(item => item.i !== widgetId));
    setUnsavedChanges(true);
  };

  const handleSaveLayout = () => {
    onLayoutChange(layout);
    setUnsavedChanges(false);
    setEditMode(false);
  };

  const handleCancel = () => {
    setLayout(initialLayout || DEFAULT_LAYOUTS[userRole] || []);
    setUnsavedChanges(false);
    setEditMode(false);
  };

  const handleResetDefault = () => {
    setLayout(DEFAULT_LAYOUTS[userRole] || []);
    setUnsavedChanges(true);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2 px-2">
        <button
          onClick={handleSync}
          disabled={syncing}
          title="Force-sync all platform data"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync'}
        </button>

        <Button
          variant={editMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setEditMode(!editMode)}
          className="gap-2"
        >
          <Edit2 className="w-4 h-4" />
          {editMode ? 'Exit Edit' : 'Edit Dashboard'}
        </Button>

        {editMode && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLibrary(true)}
              className="gap-2"
            >
              + Add Widget
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefault}
            >
              Reset
            </Button>
          </>
        )}

        {editMode && unsavedChanges && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveLayout}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </Button>
          </>
        )}
      </div>

      {/* Grid */}
      <div className="w-full px-2">
        <GridLayout
          className="dashboard-grid"
          layout={layout}
          onLayoutChange={handleLayoutChange}
          cols={12}
          rowHeight={80}
          width={gridWidth}
          isDraggable={editMode}
          isResizable={editMode}
          compactType="vertical"
          preventCollision={false}
          useCSSTransforms={true}
          containerPadding={[0, 0]}
          margin={[12, 12]}
        >
          {layout.map(item => (
            <div
              key={item.i}
              data-grid={item}
              className={cn(
                'bg-card rounded-lg border border-border overflow-hidden shadow-sm transition-all duration-200',
                editMode && 'cursor-move ring-2 ring-primary/20 hover:ring-primary/40'
              )}
            >
              <WidgetSlot
                widgetId={item.i}
                editMode={editMode}
                onRemove={() => handleRemoveWidget(item.i)}
              />
            </div>
          ))}
        </GridLayout>
      </div>

      {/* Widget Library Drawer */}
      {showLibrary && (
        <WidgetLibrary
          currentLayout={layout}
          onAddWidget={(id) => {
            handleAddWidget(id);
            setShowLibrary(false);
          }}
          onClose={() => setShowLibrary(false)}
          userRole={userRole}
        />
      )}

      <style>{`
        .dashboard-grid {
          background: transparent;
        }
        .react-grid-layout {
          position: relative;
          transition: height 200ms ease;
        }
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top;
        }
        .react-grid-item img {
          pointer-events: none;
          user-select: none;
        }
        .react-grid-item.cssTransforms {
          transition-property: transform;
        }
        .react-grid-item.resizing {
          opacity: 0.9;
          z-index: 3;
        }
        .react-grid-item.static {
          background: transparent;
        }
        .react-grid-item.text {
          font-size: 24px;
          text-align: center;
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          margin: auto;
          height: 100%;
          width: 100%;
        }
        .react-grid-item .resizing {
          opacity: 1;
        }
        .react-grid-item .static {
          background: transparent;
        }
        .react-grid-item .text {
          font-size: 24px;
          text-align: center;
        }
        .react-grid-item .no-drag {
          height: 100%;
          width: 100%;
        }
        .react-grid-item .minMax {
          font-size: 12px;
        }
        .react-grid-item .add {
          cursor: pointer;
        }
        .resize-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          bottom: 0;
          right: 0;
          cursor: se-resize;
        }
        .text {
          font-size: 24px;
          text-align: center;
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          margin: auto;
          height: 100%;
          width: 100%;
        }
      `}</style>
    </div>
  );
}