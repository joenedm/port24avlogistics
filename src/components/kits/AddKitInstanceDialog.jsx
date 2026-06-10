import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/api/db';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, Save } from 'lucide-react';

/**
 * AddKitInstanceDialog — clones a kit definition into a new physical kit instance.
 * 
 * The user can:
 *   - Name the new instance (e.g. "Dsan Kit - 2")
 *   - Optionally assign a unique barcode / QR
 *   - Optionally set a storage location
 * 
 * The new kit inherits kit_type, daily_rate, auto_price, notes from the source.
 * Contents (assets) are NOT automatically moved — each physical instance tracks its own assets.
 */
export default function AddKitInstanceDialog({ sourceKit, open, onOpenChange }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Auto-suggest a name based on source
  const suggestName = () => {
    if (!sourceKit) return '';
    // Strip trailing " - N" pattern and increment
    const match = sourceKit.name.match(/^(.*?)\s*-\s*(\d+)$/);
    if (match) {
      return `${match[1]} - ${parseInt(match[2]) + 1}`;
    }
    return `${sourceKit.name} - 2`;
  };

  const [form, setForm] = useState({
    name: '',
    barcode: '',
    location: '',
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open && sourceKit) {
      setForm({
        name: suggestName(),
        barcode: '',
        location: sourceKit.location || '',
      });
    }
  }, [open, sourceKit]);

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await db.entities.Kit.create({
      name: form.name.trim(),
      kit_type: sourceKit.kit_type || 'serialized',
      barcode: form.barcode.trim() || undefined,
      location: form.location.trim() || undefined,
      daily_rate: sourceKit.daily_rate,
      auto_price: sourceKit.auto_price,
      notes: sourceKit.notes || undefined,
      status: 'available',
      is_sealed: false,
    });
    qc.invalidateQueries({ queryKey: ['kits'] });
    setSaving(false);
    onOpenChange(false);
  };

  if (!sourceKit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="flex items-center gap-2 mb-4">
          <Copy className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Add Physical Kit Instance</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Creates a new independent physical unit of <strong>{sourceKit.name}</strong>. 
          Each instance has its own identity, QR code, and availability.
        </p>

        <div className="space-y-4">
          <div>
            <Label>Instance Name *</Label>
            <Input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Dsan Kit - 2"
            />
            <p className="text-xs text-muted-foreground mt-1">Give this unit a unique name to identify it</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kit QR Code / Barcode</Label>
              <Input
                value={form.barcode}
                onChange={e => set('barcode', e.target.value)}
                placeholder="e.g. KIT-002"
              />
              <p className="text-xs text-muted-foreground mt-1">Print on the case exterior</p>
            </div>
            <div>
              <Label>Storage Location</Label>
              <Input
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="Warehouse"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
            <p><strong>Inherited from source kit:</strong></p>
            <p>· Daily rate: {sourceKit.daily_rate ? `$${sourceKit.daily_rate}/day` : 'Not set'}</p>
            <p>· Auto-price: {sourceKit.auto_price ? 'Yes' : 'No'}</p>
            <p>· Type: {sourceKit.kit_type || 'serialized'}</p>
            <p className="pt-1 text-amber-500">Note: Contents (assets) are not copied — add them manually to this instance.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Creating…' : 'Create Instance'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}