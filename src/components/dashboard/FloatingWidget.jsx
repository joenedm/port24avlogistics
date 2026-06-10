import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function FloatingWidget({ 
  widgetId, 
  children, 
  onDelete,
  isDragging
}) {
  return (
    <div
      className={cn(
        "group relative animate-float",
        isDragging && "opacity-50 scale-95"
      )}
    >
      {/* Delete button - top right corner */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(widgetId)}
        className="absolute -top-2 -right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive hover:bg-destructive/90 text-white rounded-full h-6 w-6"
      >
        <X className="w-3 h-3" />
      </Button>
      
      {children}
    </div>
  );
}