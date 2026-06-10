import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Check, Package, PackageOpen, Cloud, ShoppingCart } from 'lucide-react';
import { ITEM_TYPES } from '@/lib/itemTypes';
import { cn } from '@/lib/utils';

const ICON_MAP = { Package, PackageOpen, Cloud, ShoppingCart };

/**
 * A clean type-selection modal that asks "What type of item are you creating?"
 * before entering any wizard.
 *
 * Props:
 *   open           - boolean
 *   onOpenChange   - fn(bool)
 *   onSelect       - fn(item_type_value) — called when user picks a type
 *   allowedTypes   - optional string[] to restrict which types show (e.g. ['physical_kit','cloud_kit'])
 */
export default function ItemTypeSelectorModal({ open, onOpenChange, onSelect, allowedTypes }) {
  const types = allowedTypes
    ? ITEM_TYPES.filter(t => allowedTypes.includes(t.value))
    : ITEM_TYPES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b bg-muted/20">
          <h2 className="text-lg font-bold">What type of item are you creating?</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            The type determines how the item behaves across the platform.
          </p>
        </div>

        {/* Type cards */}
        <div className="p-4 space-y-2">
          {types.map(t => {
            const Icon = ICON_MAP[t.icon] || Package;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => { onOpenChange(false); onSelect(t.value); }}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                  "border-muted hover:border-primary/40 hover:bg-primary/5 group"
                )}
              >
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                  `${t.bgColor} ${t.color}`
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{t.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5 italic">e.g. {t.examples}</p>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 border-muted flex items-center justify-center shrink-0 transition-all",
                  "group-hover:border-primary"
                )}>
                  <Check className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}