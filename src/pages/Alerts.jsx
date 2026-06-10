import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Trash2, AlertTriangle, AlertCircle, Info, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import moment from 'moment';
import PageHeader from '@/components/shared/PageHeader';

const severityConfig = {
  info: { icon: Info, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', badge: 'bg-blue-500/10 text-blue-600' },
  warning: { icon: AlertTriangle, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', badge: 'bg-amber-500/10 text-amber-600' },
  critical: { icon: AlertCircle, color: 'bg-red-500/10 text-red-600 border-red-500/20', badge: 'bg-red-500/10 text-red-600' },
};

const typeLabels = {
  missing_item: 'Missing Item',
  incomplete_scan: 'Incomplete Scan',
  late_return: 'Late Return',
  load_out_reminder: 'Load-out Reminder',
  incomplete_kit: 'Incomplete Kit',
  low_stock: 'Low Stock',
  custom: 'Custom',
};

export default function Alerts() {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ type: 'custom', severity: 'warning', title: '', message: '' });
  const queryClient = useQueryClient();

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => base44.entities.Alert.list('-created_date', 100),
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Alert.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const resolveMutation = useMutation({
    mutationFn: (id) => base44.entities.Alert.update(id, { is_resolved: true, is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Alert.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Alert.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['alerts'] }); setCreateOpen(false); setForm({ type: 'custom', severity: 'warning', title: '', message: '' }); },
  });

  const markAllRead = async () => {
    const unread = alerts.filter(a => !a.is_read && !a.is_resolved);
    await Promise.all(unread.map(a => base44.entities.Alert.update(a.id, { is_read: true })));
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
  };

  const active = alerts.filter(a => !a.is_resolved);
  const resolved = alerts.filter(a => a.is_resolved);
  const unreadCount = active.filter(a => !a.is_read).length;

  const AlertCard = ({ alert }) => {
    const config = severityConfig[alert.severity] || severityConfig.info;
    const Icon = config.icon;
    return (
      <div className={cn("flex gap-3 p-4 rounded-lg border transition-all", config.color, alert.is_read && 'opacity-60')}>
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">{alert.title}</p>
              <p className="text-sm mt-0.5">{alert.message}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{typeLabels[alert.type] || alert.type}</Badge>
                {alert.show_name && <Badge variant="outline" className="text-xs">{alert.show_name}</Badge>}
                {alert.asset_name && <Badge variant="outline" className="text-xs">{alert.asset_name}</Badge>}
                <span className="text-xs text-current opacity-60">{moment(alert.created_date).fromNow()}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {!alert.is_read && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markReadMutation.mutate(alert.id)} title="Mark read">
              <CheckCheck className="w-3.5 h-3.5" />
            </Button>
          )}
          {!alert.is_resolved && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => resolveMutation.mutate(alert.id)} title="Resolve">
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(alert.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Alerts & Notifications"
        description="Track missing items, incomplete scans, and system alerts"
        actions={
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead}>
                <CheckCheck className="w-3.5 h-3.5 mr-1.5" /> Mark all read
              </Button>
            )}
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Create Alert
            </Button>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{alerts.filter(a => !a.is_resolved && a.severity === 'critical').length}</p>
          <p className="text-xs text-muted-foreground mt-1">Critical</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{alerts.filter(a => !a.is_resolved && a.severity === 'warning').length}</p>
          <p className="text-xs text-muted-foreground mt-1">Warnings</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{unreadCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Unread</p>
        </Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active">
            Active {active.length > 0 && <Badge className="ml-1.5 h-5 px-1.5 text-xs">{active.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {active.length === 0 ? (
            <Card className="p-12 text-center">
              <Bell className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">All clear — no active alerts</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {active.sort((a, b) => {
                const order = { critical: 0, warning: 1, info: 2 };
                return (order[a.severity] || 2) - (order[b.severity] || 2);
              }).map(alert => <AlertCard key={alert.id} alert={alert} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolved">
          {resolved.length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No resolved alerts</p></Card>
          ) : (
            <div className="space-y-3">
              {resolved.map(alert => <AlertCard key={alert.id} alert={alert} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Alert */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Alert</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <Label>Message *</Label>
              <Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={3} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit">Create Alert</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}