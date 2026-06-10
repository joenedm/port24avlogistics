import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, DollarSign, Copy, Download, Send, CheckCircle2, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import StatusBadge from '@/components/shared/StatusBadge';

export default function ProjectBillingPanel({ show, userRole }) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [paymentNotes, setPaymentNotes] = useState('');

  const queryClient = useQueryClient();

  // Fetch invoice for this show
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', show.id],
    queryFn: () => db.entities.Invoice.filter({ show_id: show.id })
  });

  // Fetch quote for comparison
  const { data: quote } = useQuery({
    queryKey: ['quotes', show.id],
    queryFn: async () => {
      if (!invoices[0]?.quote_id) return null;
      const quotes = await db.entities.Quote.filter({ id: invoices[0].quote_id });
      return quotes[0];
    },
    enabled: !!invoices[0]?.quote_id
  });

  // Fetch client details
  const { data: client } = useQuery({
    queryKey: ['clients', invoices[0]?.client_id],
    queryFn: () => db.entities.Client.filter({ id: invoices[0]?.client_id }),
    enabled: !!invoices[0]?.client_id,
    select: data => data[0]
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!invoices[0]) throw new Error('No invoice found');
      
      const amount = parseFloat(paymentAmount);
      const invoice = invoices[0];
      const newAmountPaid = (invoice.amount_paid || 0) + amount;
      const newStatus = newAmountPaid >= invoice.total ? 'paid' : 'partially_paid';

      // Record payment in history
      const paymentEntry = {
        id: crypto.randomUUID?.() || `payment-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'payment',
        amount,
        method: paymentMethod,
        notes: paymentNotes || 'Manual payment recorded'
      };

      const updatedHistory = [...(invoice.payment_history || []), paymentEntry];

      await db.entities.Invoice.update(invoice.id, {
        amount_paid: newAmountPaid,
        amount_due: Math.max(0, invoice.total - newAmountPaid),
        status: newStatus,
        payment_history: updatedHistory
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', show.id] });
      setShowPaymentDialog(false);
      setPaymentAmount('');
      setPaymentNotes('');
      toast.success('Payment recorded');
    },
    onError: (error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    }
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!invoices[0]) throw new Error('No invoice found');
      const result = await db.functions.invoke('createStripeInvoice', {
        invoiceId: invoices[0].id
      });
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', show.id] });
      toast.success('Invoice sent to Stripe');
      // Copy payment link to clipboard if available
      if (data.hosted_invoice_url) {
        navigator.clipboard.writeText(data.hosted_invoice_url);
        toast.success('Payment link copied to clipboard');
      }
    },
    onError: (error) => {
      toast.error(`Failed to send invoice: ${error.message}`);
    }
  });

  const invoice = invoices[0];

  if (!invoice) {
    return (
      <Card className="border-amber-500/20">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-muted-foreground">No billing information for this project yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isAdmin = ['admin', 'manager', 'coordinator'].includes(userRole);
  const depositRemaining = Math.max(0, (invoice.deposit_required || 0) - (invoice.deposit_paid || 0));
  const isOverdue = invoice.status === 'overdue';
  const isPaid = invoice.status === 'paid';

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={isOverdue ? 'border-red-500/20 bg-red-500/5' : isPaid ? 'border-emerald-500/20 bg-emerald-500/5' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Invoice Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={invoice.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Invoice #</span>
              <span className="font-mono text-sm">{invoice.invoice_number}</span>
            </div>
            {invoice.due_date && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Due Date</span>
                <span className="text-sm">{format(parseISO(invoice.due_date), 'MMM d, yyyy')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">${(invoice.total || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span className="text-emerald-600 font-semibold">${(invoice.amount_paid || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="font-medium">Amount Due</span>
              <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                ${(invoice.amount_due || 0).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Client</p>
              <p className="font-medium mt-1">{client?.company_name}</p>
              <p className="text-sm text-muted-foreground">{client?.billing_email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Billing Contact</p>
              <p className="font-medium mt-1">{invoice.billing_contact_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Project</p>
              <p className="font-medium mt-1">{invoice.show_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Project Date</p>
              <p className="font-medium mt-1">{show.start_date ? format(parseISO(show.start_date), 'MMM d, yyyy') : '—'}</p>
            </div>
          </div>

          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Payment Terms</p>
              <p className="font-medium mt-1">{invoice.payment_terms || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">PO Number</p>
              <p className="font-medium mt-1">{invoice.po_number || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Tax Exempt</p>
              <p className="font-medium mt-1">{invoice.tax_exempt ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {invoice.deposit_required > 0 && (
            <div className="border-t pt-4 bg-blue-500/5 border-blue-500/20 rounded-lg p-4">
              <p className="text-xs font-medium text-blue-700 uppercase mb-2">Deposit Status</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Deposit Required</span>
                  <span className="font-medium">${(invoice.deposit_required || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Deposit Paid</span>
                  <span className="font-medium text-emerald-600">${(invoice.deposit_paid || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">Remaining</span>
                  <span className={`font-semibold ${depositRemaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    ${depositRemaining.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {!invoice.stripe_invoice_id && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => sendInvoiceMutation.mutate()}
                  disabled={sendInvoiceMutation.isPending}
                >
                  <Send className="w-4 h-4" />
                  {sendInvoiceMutation.isPending ? 'Sending...' : 'Send to Stripe'}
                </Button>
              )}

              {invoice.stripe_hosted_invoice_url && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(invoice.stripe_hosted_invoice_url);
                    toast.success('Payment link copied');
                  }}
                >
                  <Copy className="w-4 h-4" />
                  Copy Payment Link
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setShowPaymentDialog(true)}
              >
                <DollarSign className="w-4 h-4" />
                Record Payment
              </Button>

              {invoice.stripe_pdf_url && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  asChild
                >
                  <a href={invoice.stripe_pdf_url} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4" />
                    Download PDF
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {invoice.payment_history && invoice.payment_history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoice.payment_history.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {payment.type === 'payment' && '💰 Payment'}
                      {payment.type === 'refund' && '↩️ Refund'}
                      {payment.type === 'credit' && '✨ Credit'}
                      {payment.type === 'adjustment' && '⚙️ Adjustment'}
                    </p>
                    <p className="text-xs text-muted-foreground">{payment.notes || payment.method}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${payment.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(payment.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min="0"
                step="0.01"
                max={invoice.amount_due}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Amount due: ${(invoice.amount_due || 0).toFixed(2)}
              </p>
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Add notes about this payment..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button
              onClick={() => recordPaymentMutation.mutate()}
              disabled={!paymentAmount || recordPaymentMutation.isPending}
            >
              {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}