import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { db } from '@/api/db';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateNextCode, useCodeSettings, getMergedSettings, previewCode } from '@/lib/useAutoCode';
import CategorySelect from '@/components/shared/CategorySelect';

const CONTAINER_TYPES = [
  { value: 'pelican', label: 'Pelican Case' },
  { value: 'road_case', label: 'Road Case' },
  { value: 'rack', label: 'Rack' },
  { value: 'tote', label: 'Tote' },
  { value: 'cable_trunk', label: 'Cable Trunk' },
  { value: 'cart', label: 'Cart' },
  { value: 'shelf', label: 'Shelf' },
  { value: 'pallet', label: 'Pallet' },
  { value: 'custom', label: 'Custom' },
];

const DEFAULT = {
  name: '', container_type: 'road_case', asset_number: '', barcode: '',
  outside_length_in: '', outside_width_in: '', outside_height_in: '',
  inside_length_in: '', inside_width_in: '', inside_height_in: '',
  empty_weight_lbs: '', max_weight_lbs: '',
  stackable: true, has_wheels: false, must_stay_upright: false, fragile: false,
  can_stack_on_top: true, can_have_items_stacked_on_it: true,
  home_location: '', status: 'available', category: '', notes: '',
};

export default function ContainerFormDialog({ open, onOpenChange, container }) {
  const isEditing = !!container;
  const [form, setForm] = useState(DEFAULT);
  const queryClient = useQueryClient();
  const { data: codeSettings = [] } = useCodeSettings();

  // Determine which code type maps to the container_type
  const getCodeType = (containerType) => {
    const MAP = { pelican: 'pelican', road_case: 'road_case', rack: 'rack', cart: 'cart', custom: 'custom_container' };
    return MAP[containerType] || 'container';
  };

  const codeType = getCodeType(form.container_type);
  const codePreview = previewCode(getMergedSettings(codeSettings, codeType));

  useEffect(() => {
    if (!open) return;
    setForm(container ? { ...DEFAULT, ...container } : DEFAULT);
  }, [open, container]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const mutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data };
      ['outside_length_in','outside_width_in','outside_height_in',
       'inside_length_in','inside_width_in','inside_height_in',
       'empty_weight_lbs','max_weight_lbs'].forEach(f => {
        payload[f] = data[f] !== '' ? Number(data[f]) : undefined;
      });
      // Auto-generate asset_number / barcode if blank and not editing
      if (!isEditing && !payload.asset_number?.trim()) {
        const ct = getCodeType(payload.container_type);
        const code = await generateNextCode(ct);
        if (code) {
          payload.asset_number = code;
          if (!payload.barcode?.trim()) payload.barcode = code;
        }
      }
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      if (isEditing) return db.entities.Container.update(container.id, payload);
      return db.entities.Container.create(payload);
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Container updated' : 'Container created');
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(`Save failed: ${e.message}`),
  });

  const SwitchRow = ({ label, desc, field }) => (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={!!form[field]} onCheckedChange={v => set(field, v)} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle>{isEditing ? `Edit — ${container.name}` : 'New Container'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Basic Info */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Basic Info</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Container Name *</Label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Audio Rack A, Pelican 1610 — Mics" />
              </div>
              <div>
                <Label>Container Type</Label>
                <Select value={form.container_type} onValueChange={v => set('container_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTAINER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category / Department</Label>
                <CategorySelect value={form.category} onChange={v => set('category', v)} />
              </div>
              <div>
                <Label>Internal Asset # / QR Code</Label>
                <Input
                  value={form.asset_number || ''}
                  onChange={e => set('asset_number', e.target.value)}
                  placeholder={isEditing ? 'e.g. CASE-001' : `Auto: ${codePreview}`}
                />
                {!isEditing && !form.asset_number && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">Will auto-generate: <span className="font-mono text-primary">{codePreview}</span></p>
                )}
              </div>
              <div>
                <Label>Barcode Value</Label>
                <Input value={form.barcode || ''} onChange={e => set('barcode', e.target.value)} placeholder={!isEditing && !form.barcode ? `Auto: ${codePreview}` : 'Scan or type'} />
              </div>
              <div>
                <Label>Home Location</Label>
                <Input value={form.home_location || ''} onChange={e => set('home_location', e.target.value)} placeholder="e.g. Shelf A3, Cage Room" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status || 'available'} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['available','assigned','packed','on_truck','on_show','returned','missing','repair'].map(s => (
                      <SelectItem key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Dimensions */}
          <div className="space-y-3 border-t pt-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dimensions (inches)</p>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Outside Dimensions</p>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Length</Label><Input type="number" step="0.1" value={form.outside_length_in || ''} onChange={e => set('outside_length_in', e.target.value)} placeholder={`L"`} /></div>
                <div><Label>Width</Label><Input type="number" step="0.1" value={form.outside_width_in || ''} onChange={e => set('outside_width_in', e.target.value)} placeholder={`W"`} /></div>
                <div><Label>Height</Label><Input type="number" step="0.1" value={form.outside_height_in || ''} onChange={e => set('outside_height_in', e.target.value)} placeholder={`H"`} /></div>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Inside Dimensions</p>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Length</Label><Input type="number" step="0.1" value={form.inside_length_in || ''} onChange={e => set('inside_length_in', e.target.value)} placeholder={`L"`} /></div>
                <div><Label>Width</Label><Input type="number" step="0.1" value={form.inside_width_in || ''} onChange={e => set('inside_width_in', e.target.value)} placeholder={`W"`} /></div>
                <div><Label>Height</Label><Input type="number" step="0.1" value={form.inside_height_in || ''} onChange={e => set('inside_height_in', e.target.value)} placeholder={`H"`} /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Empty Weight (lbs)</Label><Input type="number" step="0.1" value={form.empty_weight_lbs || ''} onChange={e => set('empty_weight_lbs', e.target.value)} /></div>
              <div><Label>Max Load Weight (lbs)</Label><Input type="number" step="0.1" value={form.max_weight_lbs || ''} onChange={e => set('max_weight_lbs', e.target.value)} /></div>
            </div>
          </div>

          {/* Handling Flags */}
          <div className="space-y-3 border-t pt-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Handling & Stacking Rules</p>
            <SwitchRow field="stackable" label="Stackable" desc="Other items can be stacked on this container" />
            <SwitchRow field="can_stack_on_top" label="Can Stack on Top of Others" desc="This container can sit on top of other containers" />
            <SwitchRow field="can_have_items_stacked_on_it" label="Allow Stacking On Top" desc="Items/cases can be placed on top of this one" />
            <SwitchRow field="has_wheels" label="Has Wheels" />
            <SwitchRow field="must_stay_upright" label="Must Stay Upright" desc="Cannot be tilted or laid on its side" />
            <SwitchRow field="fragile" label="Fragile" desc="Requires careful handling and protection" />
          </div>

          {/* Notes */}
          <div className="border-t pt-5">
            <Label>Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Internal notes, packing instructions, special handling…" />
          </div>
        </div>

        <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.name.trim()}>
            {mutation.isPending ? 'Saving…' : isEditing ? 'Update Container' : 'Create Container'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}