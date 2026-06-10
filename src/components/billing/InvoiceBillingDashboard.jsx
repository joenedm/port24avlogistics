import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Download,
  Send,
  Eye,
  RefreshCw,
  AlertTriangle,
  Filter
} from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { toast } from 'sonner';
import RecordPaymentDialog from './RecordPaymentDialog';

// Invoice status colors
const STATUS_CONFIG = {
  draft: { color: 'bg-slate-100 text-slate-800', label: 'Draft', icon: FileText },
  sent: { color: 'bg-blue-100 text-blue-800', label: 'Sent', icon: Send },
  partially_paid: { color: 'bg-amber-100 text-amber-800', label: 'Partially Paid', icon: AlertTriangle },
  paid: { color: 'bg-emerald-100 text-emerald-800', label: 'Paid', icon: CheckCircle2 },
  overdue: { color: 'bg-red-100 text-red-800', label: 'Overdue', icon: AlertCircle },
  voided: { color: 'bg-slate-200 text-slate-700', label: 'Voided', icon: FileText },
  needs_review: { color: 'bg-purple-100 text-purple-800', label: 'Needs Review', icon: AlertTriangle }
};

const BADGE_CONFIG = {
  viewed: { color: 'secondary', label: 'Viewed' },
  payment_failed: { color: 'destructive', label: 'Payment Failed' },
  refund_issued: { color: 'secondary', label: 'Refund Issued' },
  client_disputed: { color: 'destructive', label: 'Disputed' },
  manual_payment_recorded: { color: 'secondary', label: 'Manual Payment' },
  stripe_synced: { color: 'secondary', label: 'Stripe Synced' },
  stripe_sync_error: { color: 'destructive', label: 'Stripe Error' },
  quickbooks_synced: { color: 'secondary', label: 'QB Synced' },
  quickbooks_sync_error: { color: 'destructive', label: 'QB Error' },
  change_order_pending: { color: 'secondary', label: 'Change Order Pending' },
  payment_link_created: { color: 'secondary', label: 'Payment Link' },
  credit_applied: { color: 'secondary', label: 'Credit Applied' },
  check_payment: { color: 'secondary', label: 'Check' },
  ach_payment: { color: 'secondary', label: 'ACH' },
  wire_payment: { color: 'secondary', label: 'Wire' },
  cash_payment: { color: 'secondary', label: 'Cash' }
};

export default function InvoiceBillingDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const queryClient = useQueryClient();

  // Fetch invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices-billing'],
    queryFn: () => base44.entities.Invoice.list('-sent_date', 500)
  });

  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ['invoice-settings'],
    queryFn: async () => {
      const results = await base44.entities.InvoiceSettings.list();
      return results[0] || null;
    }
  });

  // Fetch payments
  const { data: payments = [] } = useQuery({
    queryKey: ['payments-all'],
    queryFn: () => base44.entities.Payment.list('-payment_date', 500)
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const result = {
      totalDraft: 0,
      totalSent: 0,
      totalPartiallyPaid: 0,
      totalPaid: 0,
      totalOverdue: 0,
      totalNeedsReview: 0,
      totalVoided: 0,
      outstandingAmount: 0,
      overduAmount: 0,
      paidThisMonth: 0,
      depositsCollected: 0,
      failedPayments: 0
    };

    invoices.forEach(inv => {
      const invTotal = inv.total || 0;
      const invDue = inv.amount_due || 0;

      // Count by status
      if (inv.status === 'draft') result.totalDraft += 1;
      if (inv.status === 'sent') result.totalSent += 1;
      if (inv.status === 'partially_paid') result.totalPartiallyPaid += 1;
      if (inv.status === 'paid') result.totalPaid += 1;
      if (inv.status === 'overdue') result.totalOverdue += 1;
      if (inv.status === 'needs_review') result.totalNeedsReview += 1;
      if (inv.status === 'voided') result.totalVoided += 1;

      // Outstanding and overdue
      if (inv.status === 'sent' || inv.status === 'partially_paid') {
        result.outstandingAmount += invDue;
      }
      if (inv.status === 'overdue') {
        result.overduAmount += invDue;
      }

      // Paid this month
      if (inv.status === 'paid' && inv.sent_date) {
        const sentDate = parseISO(inv.sent_date);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        if (sentDate >= monthAgo) {
          result.paidThisMonth += invTotal;
        }
      }

      // Deposits
      if (inv.deposit_paid) {
        result.depositsCollected += inv.deposit_paid;
      }

      // Failed payment badge
      if (inv.supporting_badges?.includes('payment_failed')) {
        result.failedPayments += 1;
      }
    });

    return result;
  }, [invoices]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch =
        !searchQuery ||
        inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.client?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.show_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Stat card component
  const StatCard = ({ title, value, icon: Icon, color = 'text-primary', format = 'number' }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">{title}</p>
            <p className={`text-2xl font-bold mt-2 ${color}`}>
              {format === 'currency'
                ? `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                : value}
            </p>
          </div>
          <Icon className={`w-8 h-8 ${color} opacity-20`} />
        </div>
      </CardContent>
    </Card>
  );

  const isOverdue = (inv) => {
    if (!inv.due_date || inv.status === 'paid' || inv.status === 'voided') return false;
    return isPast(parseISO(inv.due_date)) && (inv.amount_due || 0) > 0;
  };

  const getDaysUntilDue = (inv) => {
    if (!inv.due_date) return null;
    const due = parseISO(inv.due_date);
    const now = new Date();
    const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Outstanding"
              value={metrics.outstandingAmount}
              icon={DollarSign}
              color="text-amber-600"
              format="currency"
            />
            <StatCard
              title="Overdue"
              value={metrics.overduAmount}
              icon={AlertCircle}
              color="text-red-600"
              format="currency"
            />
            <StatCard
              title="Paid (30 days)"
              value={metrics.paidThisMonth}
              icon={CheckCircle2}
              color="text-emerald-600"
              format="currency"
            />
            <StatCard
              title="Deposits Collected"
              value={metrics.depositsCollected}
              icon={Clock}
              color="text-blue-600"
              format="currency"
            />
          </div>

          {/* Invoice Status Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Draft', count: metrics.totalDraft, status: 'draft' },
                  { label: 'Sent', count: metrics.totalSent, status: 'sent' },
                  { label: 'Partially Paid', count: metrics.totalPartiallyPaid, status: 'partially_paid' },
                  { label: 'Paid', count: metrics.totalPaid, status: 'paid' },
                  { label: 'Overdue', count: metrics.totalOverdue, status: 'overdue' },
                  { label: 'Needs Review', count: metrics.totalNeedsReview, status: 'needs_review' }
                ].map(item => (
                  <div key={item.status} className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                    <p className="text-2xl font-bold mt-1">{item.count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Issues & Alerts */}
          {(metrics.totalNeedsReview > 0 || metrics.failedPayments > 0) && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-base text-amber-900">Issues Needing Attention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {metrics.totalNeedsReview > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{metrics.totalNeedsReview} invoice(s) marked "Needs Review"</span>
                  </div>
                )}
                {metrics.failedPayments > 0 && (
                  <div className="flex items-center gap-2 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    <span>{metrics.failedPayments} invoice(s) with failed payments</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          {/* Toolbar */}
          <div className="flex gap-3 flex-wrap items-center">
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.keys(STATUS_CONFIG).map(status => (
                  <SelectItem key={status} value={status}>
                    {STATUS_CONFIG[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['invoices-billing'] })}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Invoice Table */}
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium">Invoice</th>
                      <th className="text-left py-2 px-3 font-medium">Client</th>
                      <th className="text-right py-2 px-3 font-medium">Total</th>
                      <th className="text-right py-2 px-3 font-medium">Paid</th>
                      <th className="text-right py-2 px-3 font-medium">Due</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                      <th className="text-left py-2 px-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-muted-foreground">
                          No invoices found
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map(inv => {
                        const config = STATUS_CONFIG[inv.status];
                        const daysUntilDue = getDaysUntilDue(inv);
                        return (
                          <tr key={inv.id} className="border-b hover:bg-muted/30">
                            <td className="py-3 px-3 font-mono text-xs">{inv.invoice_number}</td>
                            <td className="py-3 px-3 text-sm">{inv.client}</td>
                            <td className="py-3 px-3 text-right font-medium">
                              ${(inv.total || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-3 text-right text-emerald-600 font-medium">
                              ${(inv.amount_paid || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="font-medium">${(inv.amount_due || 0).toFixed(2)}</div>
                              {inv.due_date && (
                                <div className={`text-xs ${isOverdue(inv) ? 'text-red-600' : 'text-muted-foreground'}`}>
                                  {isOverdue(inv) ? 'OVERDUE' : `Due in ${daysUntilDue} days`}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <Badge className={config.color}>{config.label}</Badge>
                            </td>
                            <td className="py-3 px-3">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedInvoice(inv)}
                                  >
                                    View
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Invoice {inv.invoice_number}</DialogTitle>
                                  </DialogHeader>
                                  <InvoiceDetailPanel invoice={selectedInvoice} />
                                </DialogContent>
                              </Dialog>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Invoice detail panel
function InvoiceDetailPanel({ invoice }) {
  if (!invoice) return null;

  const config = STATUS_CONFIG[invoice.status];

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground uppercase">Client</p>
          <p className="font-medium">{invoice.client}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase">Project</p>
          <p className="font-medium">{invoice.show_name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase">Invoice Date</p>
          <p className="font-medium">{invoice.issue_date ? format(parseISO(invoice.issue_date), 'MMM dd, yyyy') : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase">Due Date</p>
          <p className="font-medium">{invoice.due_date ? format(parseISO(invoice.due_date), 'MMM dd, yyyy') : '—'}</p>
        </div>
      </div>

      {/* Financials */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">${(invoice.subtotal || 0).toFixed(2)}</span>
          </div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>Discount</span>
              <span>-${(invoice.discount_amount).toFixed(2)}</span>
            </div>
          )}
          {invoice.tax_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-medium">${(invoice.tax_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="border-t pt-3 flex justify-between">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold">${(invoice.total || 0).toFixed(2)}</span>
          </div>
          <div className="border-t pt-3 flex justify-between text-emerald-600">
            <span>Amount Paid</span>
            <span className="font-medium">${(invoice.amount_paid || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span className="font-semibold">Balance Due</span>
            <span className="text-lg font-bold">${(invoice.amount_due || 0).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Status & Badges */}
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase mb-2">Status</p>
          <Badge className={config.color}>{config.label}</Badge>
        </div>
        {invoice.supporting_badges?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase mb-2">Additional Flags</p>
            <div className="flex flex-wrap gap-2">
              {invoice.supporting_badges.map(badge => (
                <Badge key={badge} variant="outline">
                  {BADGE_CONFIG[badge]?.label || badge}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment History */}
      {invoice.payment_history?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Payment History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invoice.payment_history.map((payment, idx) => (
              <div key={idx} className="text-sm border-b pb-2 last:border-b-0">
                <div className="flex justify-between">
                  <span className="font-medium">${payment.amount?.toFixed(2)}</span>
                  <span className="text-muted-foreground text-xs">
                    {format(parseISO(payment.date), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {payment.method} {payment.reference_number ? `(${payment.reference_number})` : ''}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Record Payment Action */}
      {(invoice.status === 'sent' || invoice.status === 'partially_paid' || invoice.status === 'overdue') && (
        <RecordPaymentDialog invoice={invoice} />
      )}
    </div>
  );
}