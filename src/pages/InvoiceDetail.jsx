import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Send, Download, DollarSign, PanelRightOpen, PanelRightClose, LayoutTemplate } from 'lucide-react';
import InvoiceQBActions from '@/components/accounting/InvoiceQBActions';
import { printInvoice } from '@/lib/usePrintDocument';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { nanoid } from '@/lib/nanoid';
import { format } from 'date-fns';
import DocumentPreview from '@/components/documents/DocumentPreview';
import { generateInvoiceHTML } from '@/lib/documentRenderer';

const STATUS_CONFIG = {
  draft:          { label: 'Draft',    color: 'bg-muted text-muted-foreground border-muted' },
  sent:           { label: 'Sent',     color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  paid:           { label: 'Paid',     color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  partially_paid: { label: 'Partial',  color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  overdue:        { label: 'Overdue',  color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

const emptyItem = () => ({ id: nanoid(), name: '', description: '', quantity: 1, days: 1, unit_price: 0, total: 0, group_name: '' });
const calcItem = (i) => (i.unit_price || 0) * (i.quantity || 1) * (i.days || 1);

export default function InvoiceDetail() {
  const path = window.location.pathname;
  const isNew = path.endsWith('/new') || path.includes('/from-quote/');
  const fromQuoteId = path.includes('/from-quote/') ? path.split('/from-quote/')[1] : null;
  // Extract invoiceId only for existing invoice routes (not /new or /from-quote/*)
  const invoiceId = (!isNew && !fromQuoteId) ? path.split('/invoices/')[1] : null;

  const queryClient = useQueryClient();
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list() });
  const { data: quotes = [] } = useQuery({ queryKey: ['quotes'], queryFn: () => base44.entities.Quote.list() });
  const { data: shows = [] } = useQuery({ queryKey: ['shows'], queryFn: () => base44.entities.Show.list() });
  const { data: brandList = [] } = useQuery({ queryKey: ['brand'], queryFn: () => base44.entities.BrandSettings.list() });
  const { data: allPrintTemplates = [] } = useQuery({ queryKey: ['printTemplates'], queryFn: () => base44.entities.PrintTemplate.list() });
  const invoiceTemplates = allPrintTemplates.filter(t => t.template_type === 'invoice');

  const brand = brandList[0] || {};
  const invoice = invoices.find(i => i.id === invoiceId);
  const sourceQuote = fromQuoteId ? quotes.find(q => q.id === fromQuoteId) : null;

  const [form, setForm] = useState({
    show_name: '', client: '', client_email: '', client_address: '', invoice_number: `INV-${Date.now().toString().slice(-6)}`,
    status: 'draft', line_items: [emptyItem()], discount_pct: 0, tax_pct: 0, amount_paid: 0, due_date: '', issue_date: format(new Date(), 'yyyy-MM-dd'), notes: '', payment_terms: '',
  });

  useEffect(() => {
    if (invoice) {
      setForm({ ...invoice });
    } else if (sourceQuote) {
      const show = shows.find(s => s.id === sourceQuote.show_id);
      setForm(f => ({
        ...f, show_name: sourceQuote.show_name, client: sourceQuote.client,
        client_email: show?.contact_email || '',
        line_items: (sourceQuote.line_items || []).filter(li => !li.is_hidden).map(li => ({
          id: nanoid(), name: li.name, description: '', quantity: li.quantity || 1, days: li.days || 1,
          unit_price: li.override_price != null
            ? parseFloat(li.override_price) / ((parseFloat(li.quantity) || 1) * (parseFloat(li.days) || 1))
            : (parseFloat(li.daily_rate) || 0),
          total: 0, group_name: li.group_name || '',
        })),
        discount_pct: sourceQuote.discount_pct || 0, tax_pct: sourceQuote.tax_pct || 0,
      }));
    }
  }, [invoice?.id, sourceQuote?.id, shows.length]);

  const updateItem = (id, patch) => setForm(f => ({ ...f, line_items: f.line_items.map(i => i.id === id ? { ...i, ...patch } : i) }));
  const removeItem = (id) => setForm(f => ({ ...f, line_items: f.line_items.filter(i => i.id !== id) }));
  const addItem = () => setForm(f => ({ ...f, line_items: [...f.line_items, emptyItem()] }));

  const subtotal = form.line_items.reduce((s, i) => s + calcItem(i), 0);
  const discountAmount = subtotal * ((form.discount_pct || 0) / 100);
  const taxAmount = (subtotal - discountAmount) * ((form.tax_pct || 0) / 100);
  const total = subtotal - discountAmount + taxAmount;

  const saveMutation = useMutation({
    mutationFn: (data) => invoice
      ? base44.entities.Invoice.update(invoice.id, data)
      : base44.entities.Invoice.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (!invoice) window.location.href = `/invoices/${result.id}`;
    },
  });

  const [showPreview, setShowPreview] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

  useEffect(() => {
    if (!selectedTemplateId && invoiceTemplates.length > 0) {
      const def = invoiceTemplates.find(t => t.is_default) || invoiceTemplates[0];
      setSelectedTemplateId(def.id);
    }
  }, [invoiceTemplates, selectedTemplateId]);

  // Always compute preview HTML (not gated on showPreview) so it's ready instantly when toggled
  const previewHTML = useMemo(() => {
    return generateInvoiceHTML({ ...form, subtotal, discount_amount: discountAmount, tax_amount: taxAmount, total }, brand);
  }, [form, subtotal, discountAmount, taxAmount, total, brand]);

  const handleSave = (status) => {
    saveMutation.mutate({ ...form, status: status || form.status, subtotal, discount_amount: discountAmount, tax_amount: taxAmount, total });
  };

  return (
    <div className={showPreview ? "max-w-full" : "max-w-4xl mx-auto"}>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{invoice ? `Invoice #${invoice.invoice_number}` : 'New Invoice'}</h1>
          {form.client && <p className="text-muted-foreground">{form.client}</p>}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {invoice && <Badge variant="outline" className={cn('border', STATUS_CONFIG[form.status]?.color)}>{STATUS_CONFIG[form.status]?.label}</Badge>}
          <Button variant="outline" size="sm" onClick={() => handleSave()}>Save</Button>
          <Button variant="outline" size="sm" disabled={isPrinting} onClick={() => {
            if (!selectedTemplateId && invoiceTemplates.length > 0) {
              alert('Please select a template before downloading the PDF.');
              return;
            }
            printInvoice({
              invoice: { ...form, subtotal, discount_amount: discountAmount, tax_amount: taxAmount, total, template_id: selectedTemplateId },
              brand,
              templates: invoiceTemplates,
              onStart: () => setIsPrinting(true),
              onDone: () => setIsPrinting(false),
              onError: () => setIsPrinting(false),
            });
          }}>
            {isPrinting ? <><div className="w-3.5 h-3.5 mr-1.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Generating...</> : <><Download className="w-3.5 h-3.5 mr-1.5" />Download PDF</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPreview(p => !p)}>
            {showPreview ? <PanelRightClose className="w-3.5 h-3.5 mr-1.5" /> : <PanelRightOpen className="w-3.5 h-3.5 mr-1.5" />}
            {showPreview ? 'Hide Preview' : 'Preview'}
          </Button>
          {invoiceTemplates.length > 0 && (
            <div className="flex items-center gap-1.5">
              <LayoutTemplate className="w-3.5 h-3.5 text-muted-foreground" />
              <Select value={selectedTemplateId || ''} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Template…" /></SelectTrigger>
                <SelectContent>
                  {invoiceTemplates.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}{t.is_default ? ' ★' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button size="sm" onClick={() => handleSave('sent')}><Send className="w-3.5 h-3.5 mr-1.5" /> Send</Button>
        </div>
      </div>

      <div className={cn("grid gap-6", showPreview ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1 lg:grid-cols-3")}>
        <div className={cn("space-y-4", showPreview ? "" : "lg:col-span-2")}>
          {/* Client / header info */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Invoice Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div><Label>Invoice #</Label><Input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Issue Date</Label><Input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              <div className="col-span-2"><Label>Client Name</Label><Input value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} /></div>
              <div><Label>Client Email</Label><Input value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} /></div>
              <div><Label>Project</Label><Input value={form.show_name} onChange={e => setForm(f => ({ ...f, show_name: e.target.value }))} /></div>
            </CardContent>
          </Card>

          {/* Line items */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-sm">Line Items</CardTitle>
              <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-3.5 h-3.5 mr-1" /> Add Row</Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-4 py-2 grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground border-b">
                <div className="col-span-4">Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-center">Days</div>
                <div className="col-span-2 text-center">Rate</div>
                <div className="col-span-1 text-right">Total</div>
                <div className="col-span-1" />
              </div>
              {form.line_items.map(item => (
                <div key={item.id} className="px-4 py-2 grid grid-cols-12 gap-2 border-b last:border-0 items-center">
                  <div className="col-span-4">
                    <Input value={item.name} onChange={e => updateItem(item.id, { name: e.target.value })} placeholder="Item name" className="h-7 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" value={item.quantity} onChange={e => updateItem(item.id, { quantity: parseFloat(e.target.value) || 1 })} className="h-7 text-xs text-center" min="1" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" value={item.days} onChange={e => updateItem(item.id, { days: parseFloat(e.target.value) || 1 })} className="h-7 text-xs text-center" min="1" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" value={item.unit_price} onChange={e => updateItem(item.id, { unit_price: parseFloat(e.target.value) || 0 })} className="h-7 text-xs" min="0" />
                  </div>
                  <div className="col-span-1 text-right text-sm font-medium">${calcItem(item).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeItem(item.id)} className="text-destructive/50 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Totals + notes */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Totals</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Discount %</span>
                <Input type="number" value={form.discount_pct} onChange={e => setForm(f => ({ ...f, discount_pct: parseFloat(e.target.value) || 0 }))} className="w-20 h-7 text-xs text-right" min="0" max="100" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Tax %</span>
                <Input type="number" value={form.tax_pct} onChange={e => setForm(f => ({ ...f, tax_pct: parseFloat(e.target.value) || 0 }))} className="w-20 h-7 text-xs text-right" min="0" />
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" />Paid</span>
                <Input type="number" value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: parseFloat(e.target.value) || 0 }))} className="w-24 h-7 text-xs text-right" min="0" />
              </div>
              {form.amount_paid > 0 && (
                <div className="flex justify-between text-sm font-semibold text-amber-600">
                  <span>Balance Due</span><span>${Math.max(0, total - (form.amount_paid || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Notes & Terms</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Payment Terms</Label>
                <Input value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} placeholder="e.g. Net 30" className="h-8 text-sm" />
              </div>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Invoice notes..." className="w-full h-20 text-sm bg-transparent border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
            </CardContent>
          </Card>

          {/* QuickBooks Sync Actions — only on existing invoices */}
          {invoice && (
            <InvoiceQBActions
              invoice={invoice}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}
            />
          )}

          {brand.invoice_footer_note && (
            <p className="text-xs text-muted-foreground border-t pt-3">{brand.invoice_footer_note}</p>
          )}
        </div>

        {/* Live Preview Panel */}
        {showPreview && (
          <div className="rounded-xl border overflow-hidden shadow-lg" style={{ minHeight: '700px' }}>
            <DocumentPreview
              html={previewHTML}
              title={`Invoice #${form.invoice_number || 'New'}`}
              onClose={() => setShowPreview(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}