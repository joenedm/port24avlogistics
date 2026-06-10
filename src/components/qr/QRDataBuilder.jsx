import React, { useState, useCallback, useEffect } from 'react';
import { ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const AVAILABLE_FIELDS = [
  { value: 'barcode', label: 'Asset Number (barcode)' },
  { value: 'name', label: 'Asset Name' },
  { value: 'serial_numbers', label: 'Serial Number' },
  { value: 'serial_number', label: 'Serial Number (legacy)' },
  { value: 'category', label: 'Category' },
  { value: 'location', label: 'Location' },
  { value: 'id', label: 'Asset ID' },
  { value: 'kit_id', label: 'Kit ID' },
];

const SEPARATORS = [
  { value: '|', label: 'Pipe (|)' },
  { value: '-', label: 'Dash (-)' },
  { value: ',', label: 'Comma (,)' },
  { value: '/', label: 'Slash (/)' },
  { value: '\n', label: 'Newline' },
];

export default function QRDataBuilder({ config = {}, onChange = () => {} }) {
   const [fields, setFields] = useState(config.fields || ['serial_numbers']);
   const [separator, setSeparator] = useState(config.separator || '|');
   const [customSeparator, setCustomSeparator] = useState('');
   const [isExpanded, setIsExpanded] = useState(false);

  // Sample asset for preview
  const SAMPLE = {
    barcode: 'CAM-0042',
    name: 'Sony FX6 Camera',
    serial_numbers: 'SN-987654',
    category: 'Camera',
    location: 'Warehouse A',
    id: 'asset-123',
    kit_id: 'kit-456',
  };

  const activeSeparator = customSeparator || separator;

  // Generate preview QR string
  const previewString = fields
    .map(f => SAMPLE[f] || `(${f})`)
    .join(activeSeparator === '\n' ? '\n' : activeSeparator);

  // Sync to parent
  const syncConfig = useCallback(() => {
    onChange({
      fields,
      separator: customSeparator || separator,
    });
  }, [fields, separator, customSeparator, onChange]);

  useEffect(() => {
    syncConfig();
  }, [fields, separator, customSeparator, syncConfig]);

  const moveField = (idx, dir) => {
    const next = [...fields];
    const newIdx = idx + dir;
    if (newIdx >= 0 && newIdx < next.length) {
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      setFields(next);
    }
  };

  const removeField = (idx) => {
    const next = fields.filter((_, i) => i !== idx);
    setFields(next.length > 0 ? next : ['serial_numbers']);
  };

  const addField = (f) => {
    if (!fields.includes(f)) {
      setFields([...fields, f]);
    }
  };

  const unusedFields = AVAILABLE_FIELDS.filter(af => !fields.includes(af.value));

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">QR Data Builder</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {fields.length} field{fields.length !== 1 ? 's' : ''}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t divide-y bg-muted/30">
          {/* Selected Fields */}
          <div className="p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Encoded Fields (in order)
            </p>
            {fields.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No fields selected</p>
            ) : (
              <div className="space-y-1.5">
                {fields.map((f, idx) => {
                  const meta = AVAILABLE_FIELDS.find(af => af.value === f);
                  return (
                    <div
                      key={`${f}-${idx}`}
                      className="flex items-center gap-2 p-2 rounded-md bg-background border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{meta?.label || f}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {SAMPLE[f] || '(empty)'}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => moveField(idx, -1)}
                          disabled={idx === 0}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => moveField(idx, 1)}
                          disabled={idx === fields.length - 1}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={() => removeField(idx)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Field */}
          {unusedFields.length > 0 && (
            <div className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Add Field
              </p>
              <Select onValueChange={addField}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choose a field…" />
                </SelectTrigger>
                <SelectContent>
                  {unusedFields.map(f => (
                    <SelectItem key={f.value} value={f.value} className="text-xs">
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Separator */}
          <div className="p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Separator
            </p>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {SEPARATORS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => { setSeparator(s.value); setCustomSeparator(''); }}
                    className={cn(
                      'px-3 py-2 rounded-md text-xs font-medium transition-colors border',
                      separator === s.value && !customSeparator
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/40'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Input
                  type="text"
                  value={customSeparator}
                  onChange={e => setCustomSeparator(e.target.value)}
                  placeholder="Custom separator…"
                  className="h-8 text-xs"
                />
                {customSeparator && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Using custom: "{customSeparator}"
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              QR Code Data Preview
            </p>
            <Card className="bg-background p-3 border-dashed">
              <p className="text-xs font-mono whitespace-pre-wrap break-words text-foreground">
                {previewString}
              </p>
            </Card>
            <p className="text-xs text-muted-foreground">
              This is what will be encoded inside the QR code when labels are printed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}