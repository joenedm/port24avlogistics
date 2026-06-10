import React from 'react';
import { Package, Layers, Cloud, Box, Zap } from 'lucide-react';

const ITEM_TYPES = [
  {
    value: 'physical_item',
    label: 'Physical Item',
    desc: 'A single piece of equipment tracked individually',
    icon: Package,
    color: 'text-primary',
    bg: 'bg-primary/10 border-primary/30',
  },
  {
    value: 'physical_kit',
    label: 'Physical Kit',
    desc: 'A bundled set of physical gear (e.g. audio rack)',
    icon: Layers,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
  },
  {
    value: 'cloud_kit',
    label: 'Cloud Kit',
    desc: 'A virtual package or service bundle',
    icon: Cloud,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
  },
  {
    value: 'consumable',
    label: 'Consumable',
    desc: 'Depletable stock like tape, batteries, or cable',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  {
    value: 'bulk',
    label: 'Bulk Item',
    desc: 'Multiple identical units tracked by quantity',
    icon: Box,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/30',
  },
];

export default function Step1ItemType({ formData, set }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        What kind of inventory record are you creating?
      </p>
      <div className="grid grid-cols-1 gap-3">
        {ITEM_TYPES.map(({ value, label, desc, icon: Icon, color, bg }) => {
          const selected = formData.item_type === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => set('item_type', value)}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                selected
                  ? `${bg} border-opacity-100`
                  : 'border-border hover:border-muted-foreground/30 bg-muted/30'
              }`}
            >
              <div className={`p-2.5 rounded-lg ${selected ? bg : 'bg-muted'}`}>
                <Icon className={`w-5 h-5 ${selected ? color : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className={`font-semibold text-sm ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              {selected && (
                <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}