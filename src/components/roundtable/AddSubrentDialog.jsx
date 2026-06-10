import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, Search, Handshake } from 'lucide-react';
import { toast } from 'sonner';
import RoundtableBadge from './RoundtableBadge';

/**
 * AddSubrentDialog — shown on show detail pages to add Roundtable subrented items.
 * Props:
 *   showId, showName — the show this is being added to
 *   rooms — array of { id, name } sub-locations for the show
 *   onClose, onAdded
 */
export default function AddSubrentDialog({ showId, showName, rooms = [], editingSubrent = null, onClose, onAdded }) {
  const isEdit = !!editingSubrent;
  const [search, setSearch] = useState('');
  const [selectedPartner, setSelectedPartner] = useState('all');
  const [form, setForm] = useState(isEdit ? {
    item_id: editingSubrent.item_id || '',
    item_name: editingSubrent.item_name || '',
    partner_id: editingSubrent.partner_id || '',
    partner_name: editingSubrent.partner_name || '',
    category: editingSubrent.category || '',
    quantity: editingSubrent.quantity || 1,
    daily_rate: editingSubrent.daily_rate || 0,
    days: editingSubrent.days || 1,
    room_id: editingSubrent.room_id || '',
    room_name: editingSubrent.room_name || '',
    fulfillment_method: editingSubrent.fulfillment_method || 'delivery',
    delivery_date: editingSubrent.delivery_date || '',
    return_date: editingSubrent.return_date || '',
    notes: editingSubrent.notes || '',
  } : {
    item_id: '', item_name: '', partner_id: '', partner_name: '',
    category: '', quantity: 1, daily_rate: 0, days: 1,
    room_id: '', room_name: '', fulfillment_method: 'delivery',
    delivery_date: '', return_date: '', notes: '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const qc = useQueryClient();

  const { data: partners = [] } = useQuery({
    queryKey: ['roundtable_partners'],
    queryFn: () => base44.entities.RoundtablePartner.list('-created_date', 100),
  });
  const { data: items = [] } = useQuery({
    queryKey: ['roundtable_items'],
    queryFn: () => base44.entities.RoundtableItem.list('-created_date', 500),
  });

  const filtered = items.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || (item.category || '').toLowerCase().includes(search.toLowerCase());
    const matchPartner = selectedPartner === 'all' || item.partner_id === selectedPartner;
    return matchSearch && matchPartner && item.is_available !== false;
  });

  const selectItem = (item) => {
    set('item_id', item.id);
    set('item_name', item.name);
    set('partner_id', item.partner_id);
    set('partner_name', item.partner_name);
    set('category', item.category || '');
    set('daily_rate', item.daily_rate || 0);
  };

  const handleRoomChange = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    set('room_id', roomId);
    set('room_name', room?.name || '');
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const total = (form.daily_rate || 0) * (form.quantity || 1) * (form.days || 1);
      if (isEdit) {
        return base44.entities.RoundtableSubrent.update(editingSubrent.id, {
          ...form,
          total_cost: total,
        });
      }
      return base44.entities.RoundtableSubrent.create({
        ...form,
        show_id: showId,
        show_name: showName,
        total_cost: total,
        status: 'requested',
        added_by: user?.email || '',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roundtable_subrents'] });
      toast.success(isEdit ? 'Subrent updated' : 'Subrent item added to show');
      onAdded?.();
    },
  });

  const isReady = form.item_name && form.partner_id && form.fulfillment_method;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="w-4 h-4 text-amber-500" /> {isEdit ? 'Edit Subrent Item' : 'Add Roundtable Item to Show'}
          </DialogTitle>
        </DialogHeader>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search partner inventory…" className="pl-8" />
          </div>
          <Select value={selectedPartner} onValueChange={setSelectedPartner}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All partners" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Partners</SelectItem>
              {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Item List */}
        <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2 bg-muted/20">
          {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No items found. Add inventory in Roundtable → Inventory.</p>}
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => selectItem(item)}
              className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-all ${form.item_id === item.id ? 'bg-primary/15 border border-primary/30' : 'hover:bg-muted/60'}`}
            >
              <div>
                <span className="font-medium">{item.name}</span>
                {item.category && <span className="text-xs text-muted-foreground ml-2">{item.category}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <RoundtableBadge partnerName={item.partner_name} size="sm" />
                {item.daily_rate > 0 && <span className="text-xs font-mono">${item.daily_rate}/day</span>}
              </div>
            </button>
          ))}
        </div>

        {/* Ad-hoc item name if nothing selected */}
        {!form.item_id && (
          <div>
            <Label className="text-xs">Or enter item name manually</Label>
            <Input value={form.item_name} onChange={e => set('item_name', e.target.value)} placeholder="Item name…" />
          </div>
        )}
        {!form.item_id && !form.item_name && (
          <div>
            <Label className="text-xs">Partner (required for manual entry)</Label>
            <Select value={form.partner_id} onValueChange={v => {
              const p = partners.find(x => x.id === v);
              set('partner_id', v);
              set('partner_name', p?.company_name || '');
            }}>
              <SelectTrigger><SelectValue placeholder="Select partner…" /></SelectTrigger>
              <SelectContent>{partners.map(p => <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}

        {/* Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Qty</Label>
            <Input type="number" min="1" value={form.quantity} onChange={e => set('quantity', Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Days</Label>
            <Input type="number" min="1" value={form.days} onChange={e => set('days', Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Daily Rate ($)</Label>
            <Input type="number" min="0" value={form.daily_rate} onChange={e => set('daily_rate', Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Room / Area</Label>
            <Select value={form.room_id} onValueChange={handleRoomChange}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Fulfillment */}
        <div>
          <Label className="text-xs mb-2 block">How is this being fulfilled?</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'delivery', label: 'Delivered to Us', icon: Truck, desc: 'Partner delivers to our location' },
              { value: 'pickup', label: 'We Pick It Up', icon: MapPin, desc: 'We pick up from their location' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => set('fulfillment_method', opt.value)}
                className={`flex items-start gap-2 p-3 rounded-lg border text-left transition-all ${form.fulfillment_method === opt.value ? 'border-primary/60 bg-primary/8' : 'border-border hover:border-muted-foreground/40'}`}
              >
                <opt.icon className={`w-4 h-4 mt-0.5 shrink-0 ${form.fulfillment_method === opt.value ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">{form.fulfillment_method === 'delivery' ? 'Expected Delivery Date' : 'Pickup Date'}</Label>
            <Input type="date" value={form.delivery_date} onChange={e => set('delivery_date', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Return Date</Label>
            <Input type="date" value={form.return_date} onChange={e => set('return_date', e.target.value)} />
          </div>
        </div>

        <div>
          <Label className="text-xs">Notes</Label>
          <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
        </div>

        {form.item_name && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/8 border border-amber-500/20 text-sm">
            <div className="flex items-center gap-2">
              <Handshake className="w-4 h-4 text-amber-500" />
              <span className="font-medium">{form.item_name}</span>
              {form.partner_name && <RoundtableBadge partnerName={form.partner_name} size="sm" />}
            </div>
            <span className="font-mono text-sm">
              ${((form.daily_rate || 0) * (form.quantity || 1) * (form.days || 1)).toLocaleString()}
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !isReady}>
            {mutation.isPending ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save Changes' : 'Add to Show')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}