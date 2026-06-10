import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RefreshCw, Send, Link2, ExternalLink, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

function QBSyncBadge({ status }) {
  const configs = {
    synced:      { label: 'Synced',       className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    pending:     { label: 'Pending Sync', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    error:       { label: 'Sync Error',   className: 'bg-red-500/10 text-red-600 border-red-500/20' },
    needs_review:{ label: 'Needs Review', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    not_synced:  { label: 'Not Synced',   className: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  };
  const cfg = configs[status] || configs.not_synced;
  return <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>;
}

export default function InvoiceQBActions({ invoice, onRefresh }) {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [pullingStatus, setPullingStatus] = useState(false);
  const [pullingPayments, setPullingPayments] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkQbId, setLinkQbId] = useState('');
  const [linking, setLinking] = useState(false);

  if (!invoice) return null;

  const hasQBInvoice = !!invoice.quickbooks_invoice_id;
  const syncStatus = invoice.quickbooks_sync_status || 'not_synced';

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    if (onRefresh) onRefresh();
  };

  const handleSendToQB = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke('qbSyncInvoice', { invoice_id: invoice.id });
      toast.success('Invoice sent to QuickBooks');
      invalidate();
    } catch (err) {
      toast.error('Send failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const handlePullStatus = async () => {
    if (!hasQBInvoice) {
      toast.error('Invoice has not been synced to QuickBooks yet');
      return;
    }
    setPullingStatus(true);
    try {
      const res = await base44.functions.invoke('qbPullInvoiceStatus', { invoice_id: invoice.id });
      toast.success(`Status updated — ${res.data?.status || 'synced'}`);
      invalidate();
    } catch (err) {
      toast.error('Pull failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setPullingStatus(false);
    }
  };

  const handlePullPayments = async () => {
    if (!hasQBInvoice) {
      toast.error('Invoice has not been synced to QuickBooks yet');
      return;
    }
    setPullingPayments(true);
    try {
      const res = await base44.functions.invoke('qbPullPayments', { invoice_id: invoice.id });
      toast.success(`${res.data?.payments_imported || 0} payment(s) imported from QuickBooks`);
      invalidate();
    } catch (err) {
      toast.error('Pull payments failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setPullingPayments(false);
    }
  };

  const handleMarkNeedsReview = async () => {
    try {
      await base44.entities.Invoice.update(invoice.id, {
        quickbooks_sync_status: 'needs_review',
        status: 'needs_review',
      });
      toast.success('Marked as Needs Review');
      invalidate();
    } catch (err) {
      toast.error('Failed: ' + err.message);
    }
  };

  const handleLink = async () => {
    if (!linkQbId.trim()) return;
    setLinking(true);
    try {
      await base44.functions.invoke('qbLinkInvoice', {
        invoice_id: invoice.id,
        quickbooks_invoice_id: linkQbId.trim(),
      });
      toast.success('Linked to QuickBooks invoice');
      setLinkDialogOpen(false);
      setLinkQbId('');
      invalidate();
    } catch (err) {
      toast.error('Link failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLinking(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              QuickBooks Sync
              <QBSyncBadge status={syncStatus} />
            </CardTitle>
            {hasQBInvoice && invoice.quickbooks_invoice_url && (
              <a
                href={invoice.quickbooks_invoice_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="w-3 h-3" /> Open in QuickBooks
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasQBInvoice && (
            <div className="grid grid-cols-2 gap-2 text-xs pb-2 border-b">
              <div>
                <p className="text-muted-foreground">QB Invoice #</p>
                <p className="font-mono font-medium">{invoice.quickbooks_invoice_number || invoice.quickbooks_invoice_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Synced</p>
                <p>{invoice.last_quickbooks_sync_at ? format(new Date(invoice.last_quickbooks_sync_at), 'MMM d, h:mm a') : '—'}</p>
              </div>
            </div>
          )}

          {syncStatus === 'error' && invoice.quickbooks_sync_error && (
            <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-600 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {invoice.quickbooks_sync_error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {/* Primary action */}
            <Button
              size="sm"
              onClick={handleSendToQB}
              disabled={syncing}
              className="gap-2 h-8 text-xs"
            >
              {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {hasQBInvoice ? 'Re-sync to QuickBooks' : 'Send to QuickBooks'}
            </Button>

            {hasQBInvoice && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePullStatus}
                  disabled={pullingStatus}
                  className="gap-2 h-8 text-xs"
                >
                  {pullingStatus ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Pull Status
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePullPayments}
                  disabled={pullingPayments}
                  className="gap-2 h-8 text-xs"
                >
                  {pullingPayments ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Pull Payments
                </Button>
              </>
            )}

            {!hasQBInvoice && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLinkDialogOpen(true)}
                className="gap-2 h-8 text-xs"
              >
                <Link2 className="w-3.5 h-3.5" />
                Link Existing QB Invoice
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkNeedsReview}
              className="gap-2 h-8 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Needs Review
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Existing QuickBooks Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Enter the QuickBooks Invoice ID to link it to this Port 24 invoice.
            </p>
            <Input
              placeholder="QuickBooks Invoice ID"
              value={linkQbId}
              onChange={e => setLinkQbId(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLink} disabled={!linkQbId.trim() || linking}>
              {linking ? 'Linking...' : 'Link Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}