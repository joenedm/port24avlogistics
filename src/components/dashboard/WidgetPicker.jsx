import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AVAILABLE_WIDGETS } from '@/lib/dashboardWidgetRegistry';

export default function WidgetPicker({ onAddWidget, selectedWidgets }) {
  const [isOpen, setIsOpen] = useState(false);

  const availableToAdd = AVAILABLE_WIDGETS.filter(w => !selectedWidgets.includes(w.id));

  const handleDragStart = (e, widgetId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('widgetId', widgetId);
    e.dataTransfer.setData('isNewWidget', 'true');
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <Plus className="w-4 h-4" />
        Add Widget
      </Button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 min-w-max p-2"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Drag widgets to add</div>
          <div className="space-y-1">
            {availableToAdd.map(widget => (
              <div
                key={widget.id}
                draggable
                onDragStart={(e) => handleDragStart(e, widget.id)}
                className="p-2 rounded hover:bg-muted cursor-move text-sm transition-colors"
              >
                {widget.label}
              </div>
            ))}
          </div>
          {availableToAdd.length === 0 && (
            <div className="p-2 text-xs text-muted-foreground">All widgets added</div>
          )}
        </div>
      )}
    </div>
  );
}