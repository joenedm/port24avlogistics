import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WIDGET_REGISTRY, getWidgetsForRole } from '@/lib/dashboardWidgetRegistry';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function DashboardCustomizer({ userRole, selectedWidgets, onSave, onCancel }) {
  const [widgets, setWidgets] = useState(selectedWidgets);
  const availableWidgets = getWidgetsForRole(userRole);
  const selectedSet = new Set(widgets);
  const unselectedWidgets = availableWidgets.filter(w => !selectedSet.has(w.id));

  const handleOnDragEnd = (result) => {
    const { source, destination, draggableId, type } = result;
    if (!destination) return;

    if (type === 'WIDGET') {
      if (source.droppableId === 'available' && destination.droppableId === 'selected') {
        // Add widget
        setWidgets([...widgets, draggableId]);
      } else if (source.droppableId === 'selected' && destination.droppableId === 'available') {
        // Remove widget
        setWidgets(widgets.filter(w => w !== draggableId));
      } else if (source.droppableId === 'selected' && destination.droppableId === 'selected') {
        // Reorder
        const arr = [...widgets];
        const [removed] = arr.splice(source.index, 1);
        arr.splice(destination.index, 0, removed);
        setWidgets(arr);
      }
    }
  };

  const handleSave = async () => {
    await onSave(widgets);
    toast.success('Dashboard saved');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="w-full h-[80vh] bg-background border-t border-border flex flex-col rounded-t-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold">Customize Dashboard</h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex gap-6 px-6 py-6">
          <DragDropContext onDragEnd={handleOnDragEnd}>
            {/* Selected widgets (left) */}
            <div className="flex-1 flex flex-col">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Your Dashboard</h3>
              <Droppable droppableId="selected" type="WIDGET">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex-1 border border-dashed rounded-lg p-4 overflow-y-auto space-y-2',
                      snapshot.isDraggingOver ? 'bg-primary/10 border-primary/40' : 'border-border'
                    )}
                  >
                    {widgets.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        Drag widgets here to add them to your dashboard
                      </p>
                    ) : (
                      widgets.map((widgetId, idx) => {
                        const widget = WIDGET_REGISTRY[widgetId];
                        return (
                          <Draggable key={widgetId} draggableId={widgetId} index={idx} type="WIDGET">
                            {(dp, ds) => (
                              <div
                                ref={dp.innerRef}
                                {...dp.draggableProps}
                                className={cn(
                                  'flex items-center gap-3 p-3 rounded-lg border bg-card cursor-move',
                                  ds.isDragging && 'shadow-lg ring-1 ring-primary/40'
                                )}
                              >
                                <div {...dp.dragHandleProps} className="text-muted-foreground">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{widget.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{widget.description}</p>
                                </div>
                                <button
                                  onClick={() => setWidgets(widgets.filter((_, i) => i !== idx))}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </Draggable>
                        );
                      })
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Available widgets (right) */}
            <div className="w-80 flex flex-col">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Available Widgets</h3>
              <Droppable droppableId="available" type="WIDGET">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex-1 border border-dashed rounded-lg p-4 overflow-y-auto space-y-2',
                      snapshot.isDraggingOver ? 'bg-primary/10 border-primary/40' : 'border-border'
                    )}
                  >
                    {unselectedWidgets.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        All available widgets added
                      </p>
                    ) : (
                      unselectedWidgets.map((widget, idx) => (
                        <Draggable key={widget.id} draggableId={widget.id} index={idx} type="WIDGET">
                          {(dp, ds) => (
                            <div
                              ref={dp.innerRef}
                              {...dp.draggableProps}
                              {...dp.dragHandleProps}
                              className={cn(
                                'flex items-start gap-2 p-3 rounded-lg border bg-card cursor-move',
                                ds.isDragging && 'shadow-lg ring-1 ring-primary/40'
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{widget.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{widget.description}</p>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </DragDropContext>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Layout
          </Button>
        </div>
      </div>
    </div>
  );
}