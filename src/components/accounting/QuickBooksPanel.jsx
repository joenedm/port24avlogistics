import React, { useEffect, useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CheckCircle2, AlertCircle, RefreshCw, Link2, Unlink, Building2, Clock, BookOpen, ArrowRightLeft, ExternalLink, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

function SyncStatusBadge({ status }) {
  const configs = {
    synced:      { label: 'Synced',       className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    pending:     { label: 'Pending',      className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    error:       { label: 'Sync Error',   className: 'bg-red-500/10 text-red-600 border-red-500/20' },
    needs_review:{ label: 'Needs Review', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    not_synced:  { label: 'Not Synced',   className: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  };
  const cfg = configs[status] || configs.not_synced;
  return <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>;
}

export default function QuickBooksPanel() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [callbackStatus, setCallbackStatus] = useState(null);
  const [callbackError, setCallbackError] = useState(null);
  const [mappingForm, setMappingForm] = useState({});

  // Handle qb_callback redirect param from external sync service
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cbResult = params.get('qb_callback');

    if (cbResult === 'success') {
      setCallbackStatus('success');
      queryClient.invalidateQueries({ queryKey: ['qb-status'] });
      toast.success('QuickBooks connected successfully!');
      window.history.replaceState({}, '', window.location.pathname + '?tab=accounting');
    } else if (cbResult === 'error') {
      setCallbackStatus('error');
      setCallbackError('QuickBooks connection was not completed. Please try again.');
      window.history.replaceState({}, '', window.location.pathname + '?tab=accounting');
    }
  }, []);

  const { data: status, isLoading } = useQuery({
    queryKey: ['qb-status'],
    queryFn: () => db.functions.invoke('qbGetStatus', {}).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => db.entities.Invoice.list('-created_date', 50),
  });

  // Load mapping form from QB connection entity
  const { data: connections = [] } = useQuery({
    queryKey: ['qbConnection'],
    queryFn: () => db.entities.QuickBooksConnection.list().catch(() => []),
  });
  const connection = connections[0] || null;

  useEffect(() => {
    if (connection) {
      setMappingForm({
        income_account_equipment: connection.income_account_equipment || '',
        income_account_labor: connection.income_account_labor || '',
        income_account_logistics: connection.income_account_logistics || '',
        income_account_consumables: connection.income_account_consumables || '',
        income_account_discounts: connection.income_account_discounts || '',
        deposit_account: connection.deposit_account || '',
        default_terms: connection.default_terms || '',
        sales_tax_code: connection.sales_tax_code || '',
        default_service_item: connection.default_service_item || '',
        auto_sync_on_invoice_send: connection.auto_sync_on_invoice_send !== false,
        sync_customers: connection.sync_customers !== false,
        sync_invoices: connection.sync_invoices !== false,
        sync_payments: connection.sync_payments !== false,
      });
    }
  }, [connection?.id]);

  const handleConnect = async () => {
    try {
      const res = await db.functions.invoke('qbGetConnectURL', {});
      if (res.data?.connect_url) {
        // Full browser redirect — do NOT open in iframe or modal
        window.location.href = res.data.connect_url;
      } else {
        toast.error(res.data?.error || 'Failed to get connect URL');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleDisconnect = async () => {
    try {
      await db.functions.invoke('qbDisconnectAccount', {});
      toast.success('QuickBooks disconnected');
      queryClient.invalidateQueries({ queryKey: ['qb-status'] });
    } catch (err) {
      toast.error('Disconnect failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await db.functions.invoke('qbSync', { scope: 'all' });
      const report = res.data?.report || {};
      const errors = [...(report.customers?.errors || []), ...(report.invoices?.errors || [])];
      if (errors.length) {
        toast.warning(`Sync completed with ${errors.length} error(s).`);
      } else {
        toast.success(`Sync complete`);
      }
      queryClient.invalidateQueries({ queryKey: ['qb-status'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (err) {
      toast.error('Sync failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const syncOneInvoice = async (invoiceId) => {
    try {
      await db.functions.invoke('qbSyncInvoice', { invoice_id: invoiceId });
      toast.success('Invoice sent to QuickBooks');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (err) {
      toast.error('Sync failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const saveMappings = async () => {
    if (!connection) return;
    await db.entities.QuickBooksConnection.update(connection.id, mappingForm);
    queryClient.invalidateQueries({ queryKey: ['qbConnection'] });
    toast.success('Accounting settings saved');
  };

  const syncableInvoices = invoices.filter(i =>
    ['sent', 'paid', 'partially_paid', 'overdue', 'needs_review'].includes(i.status) ||
    (i.quickbooks_sync_status === 'error')
  );

  const syncServiceConfigured = status?.sync_service_configured !== false;
  const syncServiceReachable = status?.sync_service_reachable !== false;
  const isConnected = status?.is_connected;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Callback banners */}
      {callbackStatus === 'success' && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          QuickBooks connected successfully!
        </div>
      )}
      {callbackStatus === 'error' && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 space-y-1">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            QuickBooks connection failed
          </div>
          <p className="ml-6 text-xs">{callbackError}</p>
        </div>
      )}

      {/* Sync Service not configured warning */}
      {!syncServiceConfigured && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600 space-y-1">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            QuickBooks Sync Service Not Configured
          </div>
          <p className="ml-6 text-xs">
            Add <code className="font-mono bg-amber-500/10 px-1 rounded">QUICKBOOKS_SYNC_SERVICE_URL</code> to Base44 Settings → Secrets to enable QuickBooks sync.
          </p>
          <p className="ml-6 text-xs text-muted-foreground">
            Example: <code className="font-mono">https://sync.port24avlogistics.online</code>
          </p>
        </div>
      )}

      {syncServiceConfigured && !syncServiceReachable && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 space-y-1">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            QuickBooks Sync Service Offline
          </div>
          <p className="ml-6 text-xs">{status?.error}</p>
        </div>
      )}

      {/* Main Connection Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-base">QuickBooks Online</CardTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  {isConnected ? (
                    <><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-xs text-emerald-500 font-medium">Connected</span></>
                  ) : syncServiceConfigured ? (
                    <><div className="w-2 h-2 rounded-full bg-slate-500" /><span className="text-xs text-muted-foreground">Not Connected</span></>
                  ) : (
                    <><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-xs text-amber-500">Sync Service Not Configured</span></>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {isConnected ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={syncing || !syncServiceConfigured} className="gap-2">
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    Sync Now
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
                        <Unlink className="w-3.5 h-3.5" /> Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect QuickBooks?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This revokes Port 24's access to your QuickBooks company. Existing synced records remain in QuickBooks. You can reconnect at any time.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground">Disconnect</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <Button onClick={handleConnect} disabled={!syncServiceConfigured} className="gap-2">
                  <Link2 className="w-4 h-4" />
                  Connect QuickBooks
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {isConnected && (
          <CardContent className="border-t pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Company</p>
                <div className="flex items-center gap-1.5 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  {status?.company_name || '—'}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Realm ID</p>
                <p className="font-mono text-xs text-muted-foreground">{status?.realm_id || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Last Sync</p>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs">
                    {status?.last_synced_at ? format(new Date(status.last_synced_at), 'MMM d, h:mm a') : 'Never'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Sync Status</p>
                {status?.last_sync_status === 'error' ? (
                  <div className="flex items-center gap-1 text-red-500 text-xs"><AlertCircle className="w-3.5 h-3.5" />Error</div>
                ) : (
                  <div className="flex items-center gap-1 text-emerald-500 text-xs"><CheckCircle2 className="w-3.5 h-3.5" />OK</div>
                )}
              </div>
            </div>
            {status?.last_sync_error && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 inline mr-1" />{status.last_sync_error}
              </div>
            )}
          </CardContent>
        )}

        {!isConnected && syncServiceConfigured && (
          <CardContent className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Click <strong>Connect QuickBooks</strong> to authorize Port 24 to sync invoices and customer data to your QuickBooks Online account.
              You will be redirected to QuickBooks to log in and approve access.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Sync Service: <code className="font-mono text-xs">{status?.sync_service_url || '—'}</code>
            </p>
          </CardContent>
        )}
      </Card>

      {/* Invoice Sync Table — only when connected */}
      {isConnected && (
        <Tabs defaultValue="sync">
          <TabsList>
            <TabsTrigger value="sync" className="gap-2"><ArrowRightLeft className="w-3.5 h-3.5" />Invoice Sync</TabsTrigger>
            <TabsTrigger value="mapping" className="gap-2"><DollarSign className="w-3.5 h-3.5" />Accounting Mapping</TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base">Invoice Sync Queue</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Sent/active invoices — push to QuickBooks or view sync status</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleSyncAll()} disabled={syncing} className="gap-2">
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />Sync All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {syncableInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No invoices ready to sync.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground">Invoice #</th>
                          <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground">Client</th>
                          <th className="text-right py-2 px-3 font-medium text-xs text-muted-foreground">Total</th>
                          <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground">QB Invoice #</th>
                          <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground">QB Sync</th>
                          <th className="text-right py-2 px-3 font-medium text-xs text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncableInvoices.map(inv => (
                          <tr key={inv.id} className="border-b hover:bg-muted/30">
                            <td className="py-2.5 px-3 font-mono text-xs">{inv.invoice_number || '—'}</td>
                            <td className="py-2.5 px-3">{inv.client}</td>
                            <td className="py-2.5 px-3 text-right font-medium">${(inv.total || 0).toFixed(2)}</td>
                            <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">
                              {inv.quickbooks_invoice_number || inv.quickbooks_invoice_id || '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              <SyncStatusBadge status={inv.quickbooks_sync_status || 'not_synced'} />
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => syncOneInvoice(inv.id)}>
                                <RefreshCw className="w-3 h-3" />
                                {inv.quickbooks_invoice_id ? 'Re-sync' : 'Send to QB'}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4">
                <p className="text-xs font-semibold text-primary mb-2">How It Works</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-4">
                  <li>Port 24 sends invoice data to QuickBooks — QuickBooks manages the accounting invoice</li>
                  <li>QuickBooks handles client payment and payment recording</li>
                  <li>Port 24 pulls payment status back from QuickBooks</li>
                  <li>Draft invoices are never synced until you click Send to QuickBooks</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mapping" className="mt-4 space-y-6">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Sync Settings</CardTitle></CardHeader>
              <CardContent className="divide-y">
                {[
                  { key: 'auto_sync_on_invoice_send', label: 'Auto-sync when invoice is sent', desc: 'Automatically push to QB when you send an invoice' },
                  { key: 'sync_customers', label: 'Sync clients as QB Customers', desc: 'Keep Port 24 clients synced with QuickBooks Customers' },
                  { key: 'sync_invoices', label: 'Sync invoices', desc: 'Push Port 24 invoices to QuickBooks' },
                  { key: 'sync_payments', label: 'Pull payments from QuickBooks', desc: 'Pull payment status from QuickBooks into Port 24' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch checked={!!mappingForm[item.key]} onCheckedChange={v => setMappingForm(f => ({ ...f, [item.key]: v }))} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Income Account Mapping</CardTitle>
                <p className="text-xs text-muted-foreground">Enter QB account names or IDs for each category</p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'income_account_equipment', label: 'Equipment Rentals' },
                  { key: 'income_account_labor', label: 'Labor / Crew' },
                  { key: 'income_account_logistics', label: 'Logistics / Transport' },
                  { key: 'income_account_consumables', label: 'Consumables' },
                  { key: 'income_account_discounts', label: 'Discounts / Adjustments' },
                  { key: 'deposit_account', label: 'Payment Deposit Account' },
                  { key: 'default_terms', label: 'Default Payment Terms' },
                  { key: 'sales_tax_code', label: 'Sales Tax Code' },
                  { key: 'default_service_item', label: 'Default Service/Item' },
                ].map(field => (
                  <div key={field.key}>
                    <Label className="text-xs">{field.label}</Label>
                    <Input
                      value={mappingForm[field.key] || ''}
                      onChange={e => setMappingForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder="QB account name or ID"
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {connection && (
              <div className="flex justify-end">
                <Button onClick={saveMappings}>Save Accounting Settings</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}