import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HeartPulse, CheckCircle2, AlertCircle, Package, Wrench,
  RotateCcw, Trash2, RefreshCw, Clock, Send, AlertTriangle, UserCog
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/shared/PageHeader';
import { isHospitalEligible } from '@/lib/itemTypes';

const REPAIR_STATUSES = [
  { value: 'waiting_inspection', label: 'Waiting Inspection', icon: Clock,       color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { value: 'under_repair',       label: 'Under Repair',       icon: Wrench,      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'sent_out',           label: 'Sent Out for Repair', icon: Send,       color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { value: 'fixed',              label: 'Fixed',               icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  { value: 'retired',            label: 'Retired',             icon: Trash2,     color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
];

const REASON_LABELS = {
  broken: 'Broken', damaged: 'Damaged',
  needs_inspection: 'Needs Inspection', needs_repair: 'Needs Repair',
};

function RepairStatusBadge({ status }) {
  const s = REPAIR_STATUSES.find(r => r.value === status);
  if (!s) return null;
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium", s.color)}>
      <Icon className="w-3 h-3" />{s.label}
    </span>
  );
}

export default function AVHospital() {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  const { data: hospitalRecords = [], isLoading } = useQuery({
    queryKey: ['avhospital'],
    queryFn: () => base44.entities.AVHospital.list('-created_date', 200),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list('-created_date', 5000),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AVHospital.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avhospital'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setSelectedRecord(null);
    },
  });

  const returnToStock = async (record) => {
    const today = new Date().toISOString().split('T')[0];
    const actorLabel = currentUser?.email || currentUser?.full_name || 'unknown';
    // Log a movement
    await base44.entities.AssetMovement.create({
      asset_id: record.asset_id, asset_name: record.asset_name, asset_barcode: record.asset_barcode,
      action: 'check_in', from_location: 'AV Hospital', to_location: 'Warehouse',
      scanned_by: actorLabel,
      scanned_by_user_id: currentUser?.id || '',
      notes: `Released from AV Hospital — ${record.repair_notes || 'Fixed'}`,
    });
    // Update asset
    await base44.entities.Asset.update(record.asset_id, {
      status: 'available', location: 'Warehouse',
      current_show_id: '', current_sub_location_id: '', current_sub_location_name: '',
    });
    // Close AV Hospital record
    updateMutation.mutate({ id: record.id, data: {
      is_active: false, repair_status: 'fixed',
      returned_to_stock_at: today,
    }});
  };

  const retireAsset = async (record) => {
    await base44.entities.Asset.update(record.asset_id, { status: 'retired', location: 'Retired' });
    updateMutation.mutate({ id: record.id, data: { is_active: false, repair_status: 'retired' }});
  };

  const active = hospitalRecords.filter(r => r.is_active);
  const resolved = hospitalRecords.filter(r => !r.is_active);
  const displayed = statusFilter === 'active' ? active : statusFilter === 'resolved' ? resolved : hospitalRecords;

  const stats = {
    inHospital: active.length,
    waiting: active.filter(r => r.repair_status === 'waiting_inspection').length,
    repairing: active.filter(r => ['under_repair', 'sent_out'].includes(r.repair_status)).length,
    fixed: resolved.length,
  };

  return (
    <div>
      <PageHeader
        title="AV Hospital"
        description="Damaged, broken, or out-of-service gear"
        actions={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HeartPulse className="w-4 h-4 text-red-500" />
            <span>{active.length} items currently in AV Hospital</span>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'In Hospital', value: stats.inHospital, color: 'text-red-600', bg: 'bg-red-500/10' },
          { label: 'Waiting Inspection', value: stats.waiting, color: 'text-amber-600', bg: 'bg-amber-500/10' },
          { label: 'Under Repair', value: stats.repairing, color: 'text-blue-600', bg: 'bg-blue-500/10' },
          { label: 'Released / Fixed', value: stats.fixed, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className={cn("text-3xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active Cases</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="all">All Records</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Records */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <HeartPulse className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No items in AV Hospital</p>
          <p className="text-sm mt-1">Mark gear as broken during scanning or from the asset detail.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(record => (
            <Card key={record.id} className={cn("transition-all", !record.is_active && "opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className={cn("p-2.5 rounded-xl shrink-0",
                    record.is_active ? 'bg-red-500/10' : 'bg-muted')}>
                    <Package className={cn("w-5 h-5", record.is_active ? 'text-red-500' : 'text-muted-foreground')} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold">{record.asset_name}</h3>
                      <RepairStatusBadge status={record.repair_status} />
                      <Badge variant="outline" className="text-xs">{REASON_LABELS[record.marked_reason] || record.marked_reason}</Badge>
                    </div>

                    {record.asset_barcode && (
                      <p className="text-xs text-muted-foreground font-mono mb-1">{record.asset_barcode}</p>
                    )}

                    {record.issue_notes && (
                      <p className="text-sm text-muted-foreground mb-1">"{record.issue_notes}"</p>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      <span>Marked by: {record.marked_by || record.created_by || 'System'}</span>
                      <span>On: {record.created_date ? new Date(record.created_date).toLocaleDateString() : '—'}</span>
                      {record.show_name && <span>Show: {record.show_name}</span>}
                      {record.returned_to_stock_at && <span>Released: {record.returned_to_stock_at}</span>}
                      {record.assigned_technician && (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <UserCog className="w-3 h-3" /> {record.assigned_technician}
                        </span>
                      )}
                    </div>
                  </div>

                  {record.is_active && (
                    <div className="flex gap-2 shrink-0 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => setSelectedRecord(record)}>
                        <RefreshCw className="w-3.5 h-3.5 mr-1" /> Update Status
                      </Button>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => returnToStock(record)} disabled={updateMutation.isPending}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Return to Stock
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30"
                        onClick={() => retireAsset(record)} disabled={updateMutation.isPending}>
                        Retire
                      </Button>
                    </div>
                  )}
                </div>

                {record.repair_notes && (
                  <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Repair notes: </span>{record.repair_notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Update Status Dialog */}
      {selectedRecord && (
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Repair Status — {selectedRecord.asset_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="mb-1.5 block">Repair Status</Label>
                <Select
                  value={selectedRecord.repair_status}
                  onValueChange={v => setSelectedRecord(r => ({ ...r, repair_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REPAIR_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Assigned Technician</Label>
                <Input
                  value={selectedRecord.assigned_technician || ''}
                  onChange={e => setSelectedRecord(r => ({ ...r, assigned_technician: e.target.value }))}
                  placeholder="Name or email of technician..."
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Repair Notes</Label>
                <Textarea
                  value={selectedRecord.repair_notes || ''}
                  onChange={e => setSelectedRecord(r => ({ ...r, repair_notes: e.target.value }))}
                  rows={3} placeholder="What was done, parts replaced, etc..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedRecord(null)}>Cancel</Button>
              <Button onClick={() => updateMutation.mutate({
                id: selectedRecord.id,
                data: {
                repair_status: selectedRecord.repair_status,
                repair_notes: selectedRecord.repair_notes,
                assigned_technician: selectedRecord.assigned_technician || '',
                assigned_at: selectedRecord.assigned_technician && !selectedRecord.assigned_at ? new Date().toISOString() : selectedRecord.assigned_at,
              }
              })} disabled={updateMutation.isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}