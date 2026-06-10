import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Plus, Trash2, Pencil, Search, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import RoundtableBadge from './RoundtableBadge';
import ItemFormDialog from './ItemFormDialog';
import RoundtableBulkImport from './RoundtableBulkImport';

const CONDITION_COLORS = { excellent: 'text-emerald-500', good: 'text-blue-500', fair: 'text-amber-500', poor: 'text-red-500' };

export default function RoundtableInventory() {
  const [search, setSearch] = useState('');
  const [filterPartner, setFilterPartner] = useState('all');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const qc = useQueryClient();

  const { data: partners = [] } = useQuery({
    queryKey: ['roundtable_partners'],
    queryFn: () => db.entities.RoundtablePartner.list('-created_date', 100),
  });
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['roundtable_items'],
    queryFn: () => db.entities.RoundtableItem.list('-created_date', 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.RoundtableItem.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roundtable_items'] }); toast.success('Item removed'); },
  });

  const filtered = items.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || (item.category || '').toLowerCase().includes(search.toLowerCase());
    const matchPartner = filterPartner === 'all' || item.partner_id === filterPartner;
    return matchSearch && matchPartner;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…" className="pl-8 w-52" />
          </div>
          <Select value={filterPartner} onValueChange={setFilterPartner}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All partners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Partners</SelectItem>
              {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowBulkImport(true)}
            disabled={partners.length === 0}>
            <Upload className="w-4 h-4" /> Bulk Upload
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setEditing(null); setShowForm(true); }}
            disabled={partners.length === 0}>
            <Plus className="w-4 h-4" /> Add Single Item
          </Button>
        </div>
      </div>

      {partners.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">Add a partner first before adding inventory items.</Card>
      )}

      {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>}

      {!isLoading && filtered.length === 0 && partners.length > 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">No items found.</Card>
      )}

      {filtered.length > 0 && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Daily Rate</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.name}</span>
                      {item.item_type === 'kit' && <Badge variant="outline" className="text-xs">Kit</Badge>}
                    </div>
                    {item.serial_numbers && <p className="text-xs text-muted-foreground mt-0.5">S/N: {item.serial_numbers}</p>}
                  </TableCell>
                  <TableCell>
                    <RoundtableBadge partnerName={item.partner_name} size="sm" />
                  </TableCell>
                  <TableCell className="text-sm">{item.category || '—'}</TableCell>
                  <TableCell className="text-sm">{item.qty_available || 1}</TableCell>
                  <TableCell className="text-sm font-mono">{item.daily_rate ? `$${item.daily_rate}/day` : '—'}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium capitalize ${CONDITION_COLORS[item.condition] || ''}`}>{item.condition || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => { setEditing(item); setShowForm(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {showForm && (
        <ItemFormDialog
          item={editing}
          partners={partners}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['roundtable_items'] }); setShowForm(false); setEditing(null); }}
        />
      )}

      {showBulkImport && (
        <RoundtableBulkImport
          partners={partners}
          defaultPartnerId={filterPartner !== 'all' ? filterPartner : undefined}
          onClose={() => setShowBulkImport(false)}
          onDone={() => { qc.invalidateQueries({ queryKey: ['roundtable_items'] }); setShowBulkImport(false); }}
        />
      )}
    </div>
  );
}