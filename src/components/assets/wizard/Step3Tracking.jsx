import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function Step3Tracking({ formData, set, allAssets, asset }) {
  const isConsumable = formData.item_type === 'consumable';
  const isBulk = formData.item_type === 'bulk';
  const isPhysical = formData.item_type === 'physical_item';

  const trackingOptions = isPhysical ? [
    { value: 'serialized', label: 'Serialized', desc: 'Track individual units with asset numbers' },
    { value: 'bulk', label: 'Bulk / Quantity Only', desc: 'Track by quantity pool, no individual IDs' },
  ] : [];

  return (
    <div className="space-y-5">
      {/* Tracking method (physical items only) */}
      {isPhysical && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Tracking Method</Label>
          <div className="grid grid-cols-1 gap-2">
            {trackingOptions.map(opt => (
              <button key={opt.value} type="button" onClick={() => set('tracking', opt.value)}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                  formData.tracking === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                }`}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  formData.tracking === opt.value ? 'border-primary' : 'border-muted-foreground'
                }`}>
                  {formData.tracking === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <div>
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Three separate ID fields */}
      {!isConsumable && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Identification</p>
          <div>
            <Label>Internal Asset Number
              <span className="text-xs text-muted-foreground font-normal ml-1">(Port 24 tracking ID)</span>
            </Label>
            <Input value={formData.asset_number || ''} onChange={e => set('asset_number', e.target.value)}
              placeholder="e.g. AV-001" />
          </div>
          {!isBulk && (
            <div>
              <Label>Manufacturer Serial Number
                <span className="text-xs text-muted-foreground font-normal ml-1">(factory serial — comma-separate multiple)</span>
              </Label>
              {formData.tracking === 'serialized' ? (
                <Textarea
                  value={formData.serial_numbers || ''}
                  onChange={e => set('serial_numbers', e.target.value)}
                  rows={3}
                  placeholder={'SHU-001, SHU-002\nor one per line…'}
                  className="font-mono text-sm"
                />
              ) : (
                <Input value={formData.serial_numbers || ''} onChange={e => set('serial_numbers', e.target.value)}
                  placeholder="e.g. SHU-A4928392" />
              )}
            </div>
          )}
          <div>
            <Label>Barcode / QR Code Value
              <span className="text-xs text-muted-foreground font-normal ml-1">(scannable label)</span>
            </Label>
            <Input value={formData.barcode || ''} onChange={e => set('barcode', e.target.value)}
              placeholder="e.g. short scan code or same as asset number" />
          </div>
        </div>
      )}

      {/* Quantity for bulk/consumable */}
      {(isBulk || isConsumable || formData.tracking === 'bulk') && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Quantity</Label>
            <Input type="number" min="0" step="1" value={formData.quantity ?? 1} onChange={e => set('quantity', e.target.value)} />
          </div>
          {(isConsumable || formData.tracking === 'consumable') && (
            <div>
              <Label>Reorder Level</Label>
              <Input type="number" min="0" step="1" value={formData.reorder_level || ''} onChange={e => set('reorder_level', e.target.value)} placeholder="Alert when below…" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}