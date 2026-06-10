import React, { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Columns } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export const DEFAULT_COLUMNS = [
  { key: 'type',      label: 'Type',           visible: true,  width: 40 },
  { key: 'typeLabel', label: 'Type Label',      visible: true,  width: 120 },
  { key: 'name',      label: 'Name',            visible: true,  width: 220 },
  { key: 'serial',    label: 'Serial / Asset #', visible: true, width: 160 },
  { key: 'category',  label: 'Category',        visible: true,  width: 130 },
  { key: 'status',    label: 'Status',           visible: true,  width: 110 },
  { key: 'condition', label: 'Condition',        visible: true,  width: 100 },
  { key: 'location',  label: 'Location',         visible: true,  width: 120 },
];

export function ColumnToggle({ columns, onChange }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Columns className="w-3.5 h-3.5" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs">Toggle Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map(col => (
          <DropdownMenuCheckboxItem
            key={col.key}
            checked={col.visible}
            onCheckedChange={(checked) =>
              onChange(columns.map(c => c.key === col.key ? { ...c, visible: checked } : c))
            }
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Resizable column header cell
export function ResizableHead({ col, children, onResize, className = '', style = {}, ...props }) {
  const startX = useRef(null);
  const startW = useRef(null);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    startX.current = e.clientX;
    startW.current = col.width;

    const onMove = (ev) => {
      const delta = ev.clientX - startX.current;
      const newW = Math.max(60, startW.current + delta);
      onResize(col.key, newW);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [col.key, col.width, onResize]);

  return (
    <th
      className={`relative select-none text-left align-middle text-xs font-medium text-muted-foreground h-10 px-2 ${className}`}
      style={{ width: col.width, minWidth: 60, ...style }}
      {...props}
    >
      {children}
      {/* Resize handle */}
      <span
        onMouseDown={onMouseDown}
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-center group"
        style={{ userSelect: 'none' }}
      >
        <span className="w-px h-4 bg-border group-hover:bg-primary transition-colors" />
      </span>
    </th>
  );
}