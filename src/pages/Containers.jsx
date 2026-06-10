import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Package2, Trash2, Pencil, QrCode, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ContainerFormDialog from '@/components/containers/ContainerFormDialog';

const TYPE_LABELS = {
  pelican: 'Pelican', road_case: 'Road Case', rack: 'Rack', tote: 'Tote',
  cable_trunk: 'Cable Trunk', cart: 'Cart', shelf: 'Shelf', pallet: 'Pallet', custom: 'Custom',
};

const STATUS_COLORS = {
  available: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  assigned: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  packed: 'bg-primary/10 text-primary border-primary/20',
  on_truck: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  on_show: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  returned: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  missing: 'bg-red-500/10 text-red-500 border-red-500/20',
  repair: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
};

export default function Containers() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: containers = [], isLoading } = useQuery({
    queryKey: ['containers'],
    queryFn: () => base44.entities.Container.list('-created_date', 2000),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Container.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['containers'] }),
  });

  const filtered = containers.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      c.name?.toLowerCase().includes(s) ||
      c.asset_number?.toLowerCase().includes(s) ||
      c.home_location?.toLowerCase().includes(s);
    const matchType = typeFilter === 'all' || c.container_type === typeFilter;
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (c) => { setEditing(c); setFormOpen(true); };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Containers & Cases</h1>
          <p className="text-sm text-muted-foreground">{containers.length} containers in inventory</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Add Container</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, asset #, location…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Container</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Dimensions (OD)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Weight</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Flags</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Home Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Archive className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground">No containers found</p>
                    <Button className="mt-3" size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add your first container</Button>
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 cursor-pointer" onDoubleClick={() => openEdit(c)}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      {c.asset_number && <p className="text-xs text-muted-foreground font-mono">{c.asset_number}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{TYPE_LABELS[c.container_type] || c.container_type}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                    {c.outside_length_in && c.outside_width_in && c.outside_height_in
                      ? `${c.outside_length_in}"L × ${c.outside_width_in}"W × ${c.outside_height_in}"H`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {c.empty_weight_lbs ? `${c.empty_weight_lbs} lbs empty` : '—'}
                    {c.max_weight_lbs ? <span className="ml-1">(max {c.max_weight_lbs})</span> : ''}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.stackable && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">Stackable</span>}
                      {c.has_wheels && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">Wheels</span>}
                      {c.must_stay_upright && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">Upright</span>}
                      {c.fragile && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">Fragile</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">{c.home_location || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs border ${STATUS_COLORS[c.status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                      {c.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Available'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Container</AlertDialogTitle>
                            <AlertDialogDescription>Delete "{c.name}"? This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(c.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ContainerFormDialog open={formOpen} onOpenChange={setFormOpen} container={editing} />
    </div>
  );
}