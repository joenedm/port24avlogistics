import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Handshake, Truck, MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import RoundtableBadge from './RoundtableBadge';

const STATUS_META = {
  requested:             { label: 'Requested',             color: 'text-slate-400' },
  awaiting_delivery:     { label: 'Awaiting Delivery',     color: 'text-blue-500' },
  delivered:             { label: 'Delivered',             color: 'text-emerald-500' },
  picked_up:             { label: 'Picked Up',             color: 'text-emerald-500' },
  in_use:                { label: 'In Use',                color: 'text-primary' },
  awaiting_return:       { label: 'Awaiting Return',       color: 'text-amber-500' },
  awaiting_vendor_pickup:{ label: 'Awaiting Vendor Pickup', color: 'text-amber-600' },
  returned:              { label: 'Returned',              color: 'text-slate-400' },
  damaged:               { label: 'Damaged / Issue',       color: 'text-red-500' },
};

const STATUS_ORDER = Object.keys(STATUS_META);

export default function RoundtableActiveSubrents() {
  const [filterStatus, setFilterStatus] = useState('active');
  const qc = useQueryClient();

  const { data: subrents = [], isLoading } = useQuery({
    queryKey: ['roundtable_subrents'],
    queryFn: () => db.entities.RoundtableSubrent.list('-created_date', 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => db.entities.RoundtableSubrent.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roundtable_subrents'] }); toast.success('Status updated'); },
  });

  const activeStatuses = ['requested', 'awaiting_delivery', 'delivered', 'picked_up', 'in_use', 'awaiting_return', 'awaiting_vendor_pickup'];
  const filtered = subrents.filter(s => {
    if (filterStatus === 'active') return activeStatuses.includes(s.status);
    if (filterStatus === 'closed') return ['returned', 'damaged'].includes(s.status);
    return true;
  });

  const fmt = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['active', 'closed', 'all'].map(v => (
            <Button key={v} size="sm" variant={filterStatus === v ? 'default' : 'outline'} onClick={() => setFilterStatus(v)} className="capitalize">
              {v}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{filtered.length} subrent{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>}

      {!isLoading && filtered.length === 0 && (
        <Card className="p-10 text-center text-sm text-muted-foreground">No subrents found.</Card>
      )}

      {filtered.length > 0 && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Show</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(sub => {
                const meta = STATUS_META[sub.status] || STATUS_META.requested;
                return (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{sub.item_name}</p>
                      {sub.room_name && <p className="text-xs text-muted-foreground">→ {sub.room_name}</p>}
                      <p className="text-xs text-muted-foreground">×{sub.quantity || 1} · {sub.days || 1} day{(sub.days || 1) !== 1 ? 's' : ''}</p>
                    </TableCell>
                    <TableCell><RoundtableBadge partnerName={sub.partner_name} size="sm" /></TableCell>
                    <TableCell className="text-sm">{sub.show_name || '—'}</TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${sub.fulfillment_method === 'pickup' ? 'text-purple-500' : 'text-blue-500'}`}>
                        {sub.fulfillment_method === 'pickup' ? <MapPin className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                        {sub.fulfillment_method === 'pickup' ? 'We Pick Up' : 'Delivered to Us'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{fmt(sub.total_cost)}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                    </TableCell>
                    <TableCell>
                      <Select value={sub.status} onValueChange={val => updateMutation.mutate({ id: sub.id, status: val })}>
                        <SelectTrigger className="w-40 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_ORDER.map(s => (
                            <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}