import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, DollarSign, Download, Eye, ExternalLink, FileText, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import StatusBadge from '@/components/shared/StatusBadge';

export default function ClientBilling() {
  const [searchQuery, setSearchQuery] = useState('');

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => db.auth.me()
  });

  // Get client contact for current user
  const { data: clientContacts = [] } = useQuery({
    queryKey: ['clientContacts', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return db.entities.ClientContact.filter({ portal_user_id: currentUser.id });
    },
    enabled: !!currentUser?.id
  });

  // Get invoices for this client
  const { data: invoices = [] } = useQuery({
    queryKey: ['clientInvoices', clientContacts[0]?.client_id],
    queryFn: () => {
      if (!clientContacts[0]?.client_id) return [];
      return db.entities.Invoice.filter({ client_id: clientContacts[0].client_id });
    },
    enabled: !!clientContacts[0]?.client_id
  });

  // Get shows for display
  const { data: shows = [] } = useQuery({
    queryKey: ['shows'],
    queryFn: () => db.entities.Show.list()
  });

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = !searchQuery ||
      inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.show_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const activeInvoices = filteredInvoices.filter(i => ['sent', 'viewed', 'partially_paid', 'overdue'].includes(i.status));
  const paidInvoices = filteredInvoices.filter(i => i.status === 'paid');

  // Calculate metrics
  const totalDue = activeInvoices.reduce((sum, i) => sum + (i.amount_due || 0), 0);
  const totalPaid = paidInvoices.reduce((sum, i) => sum + (i.amount_paid || 0), 0);

  const StatCard = ({ title, value, icon: Icon, color = 'text-primary' }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">{title}</p>
            <p className="text-2xl font-bold mt-2">${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
          </div>
          <Icon className={`w-8 h-8 ${color} opacity-20`} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Billing & Invoices</h1>
        <p className="text-muted-foreground mt-1">View and manage your invoices</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Amount Due"
          value={totalDue}
          icon={AlertCircle}
          color={totalDue > 0 ? 'text-amber-500' : 'text-emerald-500'}
        />
        <StatCard
          title="Total Paid (This Year)"
          value={totalPaid}
          icon={DollarSign}
          color="text-emerald-500"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Active Invoices ({activeInvoices.length})</TabsTrigger>
          <TabsTrigger value="paid">Paid Invoices ({paidInvoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeInvoices.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No active invoices</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeInvoices.map(invoice => (
                <Card key={invoice.id} className={
                  invoice.status === 'overdue' ? 'border-red-500/20 bg-red-500/5' : ''
                }>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-mono text-sm font-medium">{invoice.invoice_number}</p>
                          <StatusBadge status={invoice.status} />
                        </div>
                        <p className="text-muted-foreground">{invoice.show_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${(invoice.amount_due || 0).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">due</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 py-3 border-y text-sm mb-3">
                      <div>
                        <p className="text-muted-foreground text-xs">Invoice Total</p>
                        <p className="font-medium">${(invoice.total || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Paid</p>
                        <p className="font-medium text-emerald-600">${(invoice.amount_paid || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Due Date</p>
                        <p className="font-medium">
                          {invoice.due_date ? format(parseISO(invoice.due_date), 'MMM d') : '—'}
                        </p>
                      </div>
                    </div>

                    {invoice.deposit_required > 0 && (
                      <div className="mb-3 p-2 rounded bg-blue-500/10 border border-blue-500/20">
                        <p className="text-xs font-medium text-blue-700">
                          Deposit Due: ${Math.max(0, (invoice.deposit_required || 0) - (invoice.deposit_paid || 0)).toFixed(2)}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {invoice.stripe_hosted_invoice_url && (
                        <Button
                          size="sm"
                          className="gap-2 flex-1"
                          onClick={() => {
                            window.open(invoice.stripe_hosted_invoice_url, '_blank');
                            db.entities.Invoice.update(invoice.id, {
                              viewed_date: new Date().toISOString(),
                              status: invoice.status === 'sent' ? 'viewed' : invoice.status
                            });
                          }}
                        >
                          <DollarSign className="w-4 h-4" />
                          Pay Now
                        </Button>
                      )}
                      {invoice.stripe_pdf_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          asChild
                        >
                          <a href={invoice.stripe_pdf_url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4" />
                            PDF
                          </a>
                        </Button>
                      )}
                    </div>

                    {invoice.client_visible_notes && (
                      <div className="mt-3 p-2 rounded bg-muted text-sm">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Notes:</p>
                        <p className="text-sm">{invoice.client_visible_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          {paidInvoices.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No paid invoices yet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {paidInvoices.map(invoice => (
                <Card key={invoice.id} className="border-emerald-500/20 bg-emerald-500/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-mono text-sm font-medium">{invoice.invoice_number}</p>
                          <Badge variant="default" className="bg-emerald-600">Paid</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">{invoice.show_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${(invoice.total || 0).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.sent_date ? format(parseISO(invoice.sent_date), 'MMM d, yyyy') : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {invoice.stripe_receipt_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          asChild
                        >
                          <a href={invoice.stripe_receipt_url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4" />
                            Receipt
                          </a>
                        </Button>
                      )}
                      {invoice.stripe_pdf_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          asChild
                        >
                          <a href={invoice.stripe_pdf_url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4" />
                            Invoice
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Info Box */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">Payment Information</p>
              <p className="text-blue-800/80">
                Invoices are securely hosted on Stripe. You can pay directly through the payment link provided in each invoice. All payments are encrypted and secure.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}