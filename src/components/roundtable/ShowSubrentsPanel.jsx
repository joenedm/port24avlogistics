import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Plus, Trash2, Truck, MapPin, Handshake, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import RoundtableBadge from './RoundtableBadge';
import AddSubrentDialog from './AddSubrentDialog';

const STATUS_META = {
  requested:              { label: 'Requested',             color: 'text-slate-400' },
  awaiting_delivery:      { label: 'Awaiting Delivery',     color: 'text-blue-500' },
  delivered:              { label: 'Delivered',             color: 'text-emerald-500' },
  picked_up:              { label: 'Picked Up',             color: 'text-emerald-500' },
  in_use:                 { label: 'In Use',                color: 'text-primary' },
  awaiting_return:        { label: 'Awaiting Return',       color: 'text-amber-500' },
  awaiting_vendor_pickup: { label: 'Awaiting Vendor Pickup', color: 'text-amber-600' },
  returned:               { label: 'Returned',              color: 'text-slate-400' },
  damaged:                { label: 'Damaged / Issue',       color: 'text-red-500' },
};

const STATUS_ORDER = Object.keys(STATUS_META);
const fmt = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function ShowSubrentsPanel({ showId, showName, rooms = [] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingSubrent, setEditingSubrent] = useState(null);
  const qc = useQueryClient();

  const { data: subrents = [], isLoading } = useQuery({
    queryKey: ['roundtable_subrents', showId],
    queryFn: () => db.entities.RoundtableSubrent.filter({ show_id: showId }, '-created_date'),
    enabled: !!showId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => db.entities.RoundtableSubrent.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roundtable_subrents', showId] }); toast.success('Status updated'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.RoundtableSubrent.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roundtable_subrents', showId] }); toast.success('Subrent removed'); },
  });

  const totalCost = subrents.reduce((s, r) => s + (parseFloat(r.internal_cost || r.total_cost) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Handshake className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-sm">Roundtable Subrents</span>
          </div>
          {subrents.length > 0 && (
            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-500">
              {subrents.length} item{subrents.length !== 1 ? 's' : ''} · {fmt(totalCost)}
            </Badge>
          )}
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Add Subrent Item
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>}

      {!isLoading && subrents.length === 0 && (
        <Card className="p-10 text-center">
          <Handshake className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="font-medium text-sm mb-1">No Roundtable items on this show</p>
          <p className="text-xs text-muted-foreground">Add partner gear when owned inventory is short.</p>
        </Card>
      )}

      <div className="space-y-2">
        {subrents.map(sub => {
          const meta = STATUS_META[sub.status] || STATUS_META.requested;
          return (
            <Card key={sub.id} className="overflow-hidden border-amber-500/10 bg-amber-500/3">
              <div className="flex items-start gap-3 p-3">
                <Handshake className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{sub.item_name}</span>
                    <RoundtableBadge partnerName={sub.partner_name} size="sm" />
                    {sub.room_name && <span className="text-xs text-muted-foreground">→ {sub.room_name}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>×{sub.quantity || 1}</span>
                    <span>{sub.days || 1} day{(sub.days || 1) !== 1 ? 's' : ''}</span>
                    <span className="font-mono font-medium text-foreground">{fmt(sub.total_cost)}</span>
                    <span className={`flex items-center gap-1 font-medium ${sub.fulfillment_method === 'pickup' ? 'text-purple-500' : 'text-blue-500'}`}>
                      {sub.fulfillment_method === 'pickup' ? <MapPin className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                      {sub.fulfillment_method === 'pickup' ? 'We pick up' : 'Delivered'}
                    </span>
                    {sub.delivery_date && <span className="text-xs">{sub.delivery_date}</span>}
                  </div>
                  {sub.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{sub.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={sub.status} onValueChange={val => updateMutation.mutate({ id: sub.id, status: val })}>
                    <SelectTrigger className="w-40 h-7 text-xs">
                      <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map(s => (
                        <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-foreground" onClick={() => setEditingSubrent(sub)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(sub.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {showAdd && (
        <AddSubrentDialog
          showId={showId}
          showName={showName}
          rooms={rooms}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            qc.invalidateQueries({ queryKey: ['roundtable_subrents', showId] });
            setShowAdd(false);
          }}
        />
      )}

      {editingSubrent && (
        <AddSubrentDialog
          showId={showId}
          showName={showName}
          rooms={rooms}
          editingSubrent={editingSubrent}
          onClose={() => setEditingSubrent(null)}
          onAdded={() => {
            qc.invalidateQueries({ queryKey: ['roundtable_subrents', showId] });
            setEditingSubrent(null);
          }}
        />
      )}
    </div>
  );
}