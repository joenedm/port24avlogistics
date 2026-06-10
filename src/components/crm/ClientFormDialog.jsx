import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const EMPTY = {
  company_name: '', display_name: '', industry: '', website: '', status: 'active',
  billing_address: '', billing_city: '', billing_state: '', billing_zip: '', billing_country: 'USA',
  billing_email: '', billing_contact_name: '',
  payment_terms: 'net_30', payment_terms_custom: '',
  po_required: false, po_notes: '', coi_required: false, coi_notes: '', coi_holder_name: '', coi_minimum_coverage: '',
  quote_format: 'detailed', show_rates_on_quote: true, show_equipment_detail: true,
  invoice_format: 'standard', invoice_delivery: 'email',
  tax_exempt: false, tax_id: '', credit_limit: '',
  preferred_communication: 'email', communication_notes: '',
  internal_notes: '', general_notes: '',
};

export default function ClientFormDialog({ open, onOpenChange, client, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const isEdit = !!client;

  useEffect(() => {
    setForm(client ? { ...EMPTY, ...client } : EMPTY);
  }, [client, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? db.entities.Client.update(client.id, data)
      : db.entities.Client.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Client updated' : 'Client created');
      onSaved?.();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.company_name.trim()) { toast.error('Company name is required'); return; }
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Client' : 'Add New Client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="info" className="mt-2">
            <TabsList className="mb-4 w-full flex-wrap h-auto gap-1">
              <TabsTrigger value="info">Basic Info</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Company Name *</Label>
                  <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Legal company name" required />
                </div>
                <div>
                  <Label>Display Name</Label>
                  <Input value={form.display_name} onChange={e => set('display_name', e.target.value)} placeholder="Short name (optional)" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => set('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Industry</Label>
                  <Input value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="e.g. Technology, Healthcare" />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="billing" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Billing Address</Label>
                  <Input value={form.billing_address} onChange={e => set('billing_address', e.target.value)} />
                </div>
                <div><Label>City</Label><Input value={form.billing_city} onChange={e => set('billing_city', e.target.value)} /></div>
                <div><Label>State</Label><Input value={form.billing_state} onChange={e => set('billing_state', e.target.value)} /></div>
                <div><Label>Zip</Label><Input value={form.billing_zip} onChange={e => set('billing_zip', e.target.value)} /></div>
                <div><Label>Country</Label><Input value={form.billing_country} onChange={e => set('billing_country', e.target.value)} /></div>
                <div><Label>Billing Email</Label><Input value={form.billing_email} onChange={e => set('billing_email', e.target.value)} /></div>
                <div><Label>Billing Contact</Label><Input value={form.billing_contact_name} onChange={e => set('billing_contact_name', e.target.value)} /></div>
                <div>
                  <Label>Payment Terms</Label>
                  <Select value={form.payment_terms} onValueChange={v => set('payment_terms', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                      <SelectItem value="net_15">Net 15</SelectItem>
                      <SelectItem value="net_30">Net 30</SelectItem>
                      <SelectItem value="net_45">Net 45</SelectItem>
                      <SelectItem value="net_60">Net 60</SelectItem>
                      <SelectItem value="50_50">50/50 Split</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.payment_terms === 'custom' && (
                  <div className="col-span-2">
                    <Label>Custom Terms</Label>
                    <Input value={form.payment_terms_custom} onChange={e => set('payment_terms_custom', e.target.value)} />
                  </div>
                )}
                <div className="flex items-center justify-between border rounded-lg px-3 py-2">
                  <div><p className="text-sm font-medium">Tax Exempt</p></div>
                  <Switch checked={!!form.tax_exempt} onCheckedChange={v => set('tax_exempt', v)} />
                </div>
                {form.tax_exempt && <div><Label>Tax ID</Label><Input value={form.tax_id} onChange={e => set('tax_id', e.target.value)} /></div>}
              </div>
            </TabsContent>

            <TabsContent value="requirements" className="space-y-3">
              <div className="border rounded-lg divide-y">
                <div className="flex items-center justify-between px-4 py-3">
                  <div><p className="text-sm font-medium">PO Number Required</p><p className="text-xs text-muted-foreground">Require a PO number on all invoices</p></div>
                  <Switch checked={!!form.po_required} onCheckedChange={v => set('po_required', v)} />
                </div>
                {form.po_required && (
                  <div className="px-4 py-3">
                    <Label>PO Notes</Label>
                    <Input value={form.po_notes} onChange={e => set('po_notes', e.target.value)} placeholder="Where to get PO, format, etc." />
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3">
                  <div><p className="text-sm font-medium">COI Required</p><p className="text-xs text-muted-foreground">Certificate of Insurance required</p></div>
                  <Switch checked={!!form.coi_required} onCheckedChange={v => set('coi_required', v)} />
                </div>
                {form.coi_required && (
                  <div className="px-4 py-3 space-y-2">
                    <div><Label>COI Holder Name</Label><Input value={form.coi_holder_name} onChange={e => set('coi_holder_name', e.target.value)} /></div>
                    <div><Label>Minimum Coverage</Label><Input value={form.coi_minimum_coverage} onChange={e => set('coi_minimum_coverage', e.target.value)} placeholder="e.g. $2M general liability" /></div>
                    <div><Label>COI Notes</Label><Input value={form.coi_notes} onChange={e => set('coi_notes', e.target.value)} /></div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quote Format</Label>
                  <Select value={form.quote_format} onValueChange={v => set('quote_format', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="detailed">Detailed</SelectItem>
                      <SelectItem value="summary">Summary</SelectItem>
                      <SelectItem value="rooms_only">Rooms Only</SelectItem>
                      <SelectItem value="single_page">Single Page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Invoice Delivery</Label>
                  <Select value={form.invoice_delivery} onValueChange={v => set('invoice_delivery', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="portal">Portal</SelectItem>
                      <SelectItem value="mail">Mail</SelectItem>
                      <SelectItem value="both">Email + Portal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Preferred Communication</Label>
                  <Select value={form.preferred_communication} onValueChange={v => set('preferred_communication', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="portal">Portal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Invoice Format</Label>
                  <Select value={form.invoice_format} onValueChange={v => set('invoice_format', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="summary">Summary</SelectItem>
                      <SelectItem value="itemized">Itemized</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Communication Notes</Label>
                <Textarea value={form.communication_notes} onChange={e => set('communication_notes', e.target.value)} rows={2} placeholder="Contact preferences, time zones, etc." />
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-3">
              <div>
                <Label>General Notes</Label>
                <Textarea value={form.general_notes} onChange={e => set('general_notes', e.target.value)} rows={3} placeholder="General info about this client..." />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 text-amber-600">⚠ Internal Notes (never shown to client)</Label>
                <Textarea value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)} rows={3} className="border-amber-500/30" placeholder="Internal staff notes..." />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Client'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}