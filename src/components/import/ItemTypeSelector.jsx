import React from 'react';
import { Package, Cloud, PackageOpen, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPES = [
  {
    key: 'physical',
    icon: Package,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/20',
    activeBg: 'bg-slate-500/20 border-slate-400',
    label: 'Physical Item',
    subtitle: 'Individual equipment with barcodes/serials',
    rules: [
      'Tracked by QR Code or serial number',
      'Each row = one asset (or one per serial if multiple serials)',
      'Required: Name',
      'Optional: QR Code, Serial Numbers, Category, Price, Location',
    ],
    templateCols: ['Name', 'QR Code / RFID', 'Serial Numbers', 'Category', 'Condition', 'Storage Location', 'List Price', 'Rental Price', 'Notes'],
    templateExample: ['Shure SM58 Microphone', 'SM58-001', 'SN123456', 'Audio', 'good', 'Warehouse', '100', '25', 'Dynamic vocal mic'],
  },
  {
    key: 'cloud_kit',
    icon: Cloud,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    activeBg: 'bg-blue-500/20 border-blue-400',
    label: 'Cloud Kit',
    subtitle: 'Virtual bundle for planning & quoting',
    rules: [
      'No physical barcode required',
      'Used for planning, quoting, and grouping items',
      'Each row = one Cloud Kit record',
      'Required: Name',
      'Optional: Category, Daily Rate, Notes',
    ],
    templateCols: ['Name', 'Category', 'Daily Rate', 'Notes'],
    templateExample: ['Lighting Package A', 'Lighting', '500', 'Full venue uplighting kit'],
  },
  {
    key: 'serialized_kit',
    icon: PackageOpen,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/20',
    activeBg: 'bg-amber-500/20 border-amber-500',
    label: 'Serialized Kit',
    subtitle: 'Physical case with a scannable QR code',
    rules: [
      'Tracked by its own QR Code / barcode',
      'Contains individual assets inside',
      'Each row = one Serialized Kit',
      'Required: Name',
      'Optional: QR Code, Category, Daily Rate, Location, Asset Numbers (comma-separated)',
    ],
    templateCols: ['Name', 'QR Code / RFID', 'Category', 'Daily Rate', 'Storage Location', 'Asset Numbers (Serial #s)', 'Asset Names', 'Notes'],
    templateExample: ['Audio Kit - Stage Left', 'KIT-001', 'Audio', '250', 'Flight Case 3', 'SN123, SN124, SN125', 'SM58 Mic, SM58 Mic, XLR Cable', 'Main stage audio kit'],
  },
];

export { TYPES };

export default function ItemTypeSelector({ selected, onSelect }) {
  return (
    <div className="space-y-3 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Choose what you are importing. This controls which fields are required, how records are saved, and how the system tracks them.
      </p>
      {TYPES.map(t => {
        const Icon = t.icon;
        const isActive = selected === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onSelect(t.key)}
            className={cn(
              'w-full text-left rounded-xl border-2 p-4 transition-all',
              isActive ? t.activeBg : `${t.bg} hover:opacity-90`
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn('mt-0.5 shrink-0', t.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{t.label}</p>
                  {isActive && (
                    <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">Selected</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{t.subtitle}</p>
                {isActive && (
                  <ul className="mt-2 space-y-0.5">
                    {t.rules.map((r, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <ChevronRight className="w-3 h-3 shrink-0" /> {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}