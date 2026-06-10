import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, FileText, QrCode, ClipboardList, FileCheck, Eye, ToggleLeft, ToggleRight, CheckCircle2, Wand2 } from 'lucide-react';
import DocumentPreview from '@/components/documents/DocumentPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import PageHeader from '@/components/shared/PageHeader';
import { cn } from '@/lib/utils';

const TEMPLATE_TYPES = [
  { value: 'quote', label: 'Quote', icon: FileText, color: 'blue', description: 'Client-facing quote document' },
  { value: 'invoice', label: 'Invoice', icon: FileCheck, color: 'emerald', description: 'Billing invoice document' },
  { value: 'pick_list', label: 'Pick List', icon: ClipboardList, color: 'violet', description: 'Equipment pull / load-out list' },
  { value: 'qr_label', label: 'QR Label', icon: QrCode, color: 'amber', description: 'Printed sticker labels for assets' },
  { value: 'other', label: 'Other', icon: FileText, color: 'slate', description: 'Custom document template' },
];

const TYPE_COLORS = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'bg-violet-100 text-violet-600', badge: 'bg-violet-100 text-violet-700 border-violet-200' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'bg-slate-100 text-slate-600', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const VARIABLES = {
  qr_label: ['{{asset.name}}', '{{asset.barcode}}', '{{asset.serial_numbers}}', '{{asset.category}}', '{{asset.location}}'],
  pick_list: ['{{show.name}}', '{{show.venue}}', '{{show.start_date}}', '{{show.client}}', '{{items}}', '{{company.name}}'],
  quote: ['{{quote.number}}', '{{show.name}}', '{{show.client}}', '{{show.venue}}', '{{line_items}}', '{{subtotal}}', '{{tax}}', '{{total}}'],
  invoice: ['{{invoice.number}}', '{{show.name}}', '{{client.name}}', '{{line_items}}', '{{subtotal}}', '{{total}}', '{{due_date}}'],
  other: ['{{company.name}}', '{{company.logo}}', '{{date}}'],
};

const DEFAULT_BODY = {
  qr_label: `<div style="font-family:sans-serif;padding:8px;width:200px;border:2px solid #e2e8f0;border-radius:8px;">
  <div style="font-weight:bold;font-size:14px;">{{asset.name}}</div>
  <div style="font-size:11px;color:#64748b;">{{asset.category}}</div>
  <div style="font-size:10px;font-family:monospace;margin-top:4px;">SN: {{asset.serial_numbers}}</div>
</div>`,
  pick_list: `<div style="font-family:sans-serif;max-width:860px;margin:auto;padding:32px;">
  <h1 style="font-size:28px;font-weight:800;">{{show.name}} — Pick List</h1>
  <p style="color:#64748b;">Client: {{show.client}} | Venue: {{show.venue}} | Date: {{show.start_date}}</p>
  <table style="width:100%;border-collapse:collapse;margin-top:24px;">
    <thead>
      <tr style="background:#1e293b;color:white;">
        <th style="padding:10px 16px;text-align:left;border-radius:8px 0 0 0;">Item</th>
        <th style="padding:10px 16px;text-align:left;">Qty</th>
        <th style="padding:10px 16px;text-align:left;">Serial / Barcode</th>
        <th style="padding:10px 16px;text-align:center;border-radius:0 8px 0 0;">✓</th>
      </tr>
    </thead>
    <tbody>{{items}}</tbody>
  </table>
</div>`,
  quote: `<div style="font-family:sans-serif;max-width:860px;margin:auto;padding:32px;">
  <h1 style="font-size:28px;font-weight:800;">QUOTE</h1>
  <p><strong>Client:</strong> {{show.client}} | <strong>Project:</strong> {{show.name}}</p>
  <table style="width:100%;border-collapse:collapse;margin-top:24px;border:2px solid #e2e8f0;border-radius:12px;overflow:hidden;">
    <thead><tr style="background:#f8fafc;">
      <th style="padding:10px 16px;text-align:left;">Description</th>
      <th style="padding:10px 16px;">Qty</th>
      <th style="padding:10px 16px;">Days</th>
      <th style="padding:10px 16px;">Rate</th>
      <th style="padding:10px 16px;">Total</th>
    </tr></thead>
    <tbody>{{line_items}}</tbody>
  </table>
  <div style="text-align:right;margin-top:16px;font-size:16px;">
    <p>Subtotal: {{subtotal}}</p><p>Tax: {{tax}}</p><p><strong>Total: {{total}}</strong></p>
  </div>
</div>`,
  invoice: `<div style="font-family:sans-serif;max-width:860px;margin:auto;padding:32px;">
  <h1 style="font-size:28px;font-weight:800;">INVOICE #{{invoice.number}}</h1>
  <p><strong>Bill To:</strong> {{client.name}} | <strong>Due:</strong> {{due_date}}</p>
  <table style="width:100%;border-collapse:collapse;margin-top:24px;border:2px solid #e2e8f0;border-radius:12px;overflow:hidden;">
    <thead><tr style="background:#f8fafc;">
      <th style="padding:10px 16px;text-align:left;">Description</th>
      <th style="padding:10px 16px;">Qty</th>
      <th style="padding:10px 16px;">Unit Price</th>
      <th style="padding:10px 16px;">Total</th>
    </tr></thead>
    <tbody>{{line_items}}</tbody>
  </table>
  <div style="text-align:right;margin-top:16px;"><p><strong>Total: {{total}}</strong></p></div>
</div>`,
  other: `<div style="font-family:sans-serif;padding:32px;">
  <h1>{{company.name}}</h1>
  <p>{{date}}</p>
  <p>Custom content here...</p>
</div>`,
};

const empty = { name: '', template_type: 'quote', description: '', body_html: '', is_default: false };

export default function PrintTemplates() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [activeType, setActiveType] = useState('quote');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['printTemplates'],
    queryFn: async () => {
      console.log('[PrintTemplates] Fetching all PrintTemplates');
      const result = await base44.entities.PrintTemplate.list();
      console.log('[PrintTemplates] Fetched templates count:', result?.length || 0);
      console.log('[PrintTemplates] QR Label templates count:', result?.filter(t => t.template_type === 'qr_label')?.length || 0);
      result?.forEach(t => {
        if (t.template_type === 'qr_label') {
          console.log('[PrintTemplates] Found QR template:', { id: t.id, name: t.name });
        }
      });
      return result;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.PrintTemplate.update(editing.id, data)
      : base44.entities.PrintTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
      setDialogOpen(false);
      setForm(empty);
      setEditing(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_default }) => base44.entities.PrintTemplate.update(id, { is_default }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['printTemplates'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PrintTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['printTemplates'] }),
  });

  const openCreate = (type) => {
    if (type === 'quote') {
      navigate('/quote-template-builder');
      return;
    }
    if (type === 'qr_label') {
      navigate('/qr-label-builder');
      return;
    }
    if (type === 'invoice') {
      navigate('/quote-template-builder?type=invoice');
      return;
    }
    if (type === 'pick_list') {
      navigate('/quote-template-builder?type=pick_list');
      return;
    }
    setEditing(null);
    setForm({ ...empty, template_type: type, body_html: DEFAULT_BODY[type] });
    setDialogOpen(true);
  };

  const openEdit = (t) => {
    if (t.template_type === 'quote') {
      navigate(`/quote-template-builder?id=${t.id}`);
      return;
    }
    if (t.template_type === 'qr_label') {
      navigate(`/qr-label-builder?id=${t.id}`);
      return;
    }
    if (t.template_type === 'invoice' || t.template_type === 'pick_list') {
      navigate(`/quote-template-builder?id=${t.id}&type=${t.template_type}`);
      return;
    }
    setEditing(t);
    setForm({ name: t.name, template_type: t.template_type, description: t.description || '', body_html: t.body_html || '', is_default: t.is_default || false });
    setDialogOpen(true);
  };

  const handleTypeChange = (v) => {
    setForm(f => ({ ...f, template_type: v, body_html: editing ? f.body_html : DEFAULT_BODY[v] }));
  };

  const showPreview = (html) => { setPreviewHtml(html); setPreviewOpen(true); };

  const activeTypeMeta = TEMPLATE_TYPES.find(t => t.value === activeType);
  const filteredTemplates = templates.filter(t => t.template_type === activeType);
  const colors = TYPE_COLORS[activeTypeMeta?.color || 'slate'];

  return (
    <div>
      <PageHeader
        title="Document Templates"
        description="Build reusable templates for quotes, invoices, pick lists, and more"
        actions={
          <Button onClick={() => openCreate(activeType)}>
            <Plus className="w-4 h-4 mr-2" /> New {activeTypeMeta?.label} Template
          </Button>
        }
      />

      {/* Type selector tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TEMPLATE_TYPES.map(({ value, label, icon: Icon, color }) => {
          const c = TYPE_COLORS[color];
          const count = templates.filter(t => t.template_type === value).length;
          return (
            <button
              key={value}
              onClick={() => setActiveType(value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                activeType === value
                  ? `${c.bg} ${c.border} ${c.icon.split(' ')[1]}`
                  : 'bg-card border-border text-muted-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count > 0 && (
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-bold', activeType === value ? c.badge : 'bg-muted text-muted-foreground')}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active type panel */}
      <div>
        <div className={cn('rounded-2xl border-2 overflow-hidden', colors.border)}>
          {/* Panel header */}
          <div className={cn('px-6 py-4 flex items-center justify-between', colors.bg)}>
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-xl', colors.icon)}>
                {activeTypeMeta && React.createElement(activeTypeMeta.icon, { className: 'w-5 h-5' })}
              </div>
              <div>
                <h2 className="font-bold text-base">{activeTypeMeta?.label} Templates</h2>
                <p className="text-xs text-muted-foreground">{activeTypeMeta?.description}</p>
              </div>
            </div>
            <Button size="sm" onClick={() => openCreate(activeType)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Template
            </Button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-12 text-center">
              <div className={cn('w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center', colors.icon)}>
                {activeTypeMeta && React.createElement(activeTypeMeta.icon, { className: 'w-8 h-8' })}
              </div>
              <p className="font-semibold text-base mb-1">No {activeTypeMeta?.label} templates yet</p>
              <p className="text-sm text-muted-foreground mb-4">{activeTypeMeta?.description}</p>
              <Button onClick={() => openCreate(activeType)}>
                <Plus className="w-4 h-4 mr-2" /> Create First Template
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredTemplates.map(t => (
                <div key={t.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    {t.is_default && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{t.name}</p>
                        {t.is_default && <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">Default</Badge>}
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="sm"
                      className="text-xs gap-1.5 text-muted-foreground"
                      onClick={() => toggleMutation.mutate({ id: t.id, is_default: !t.is_default })}
                    >
                      {t.is_default ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                      {t.is_default ? 'Default' : 'Set Default'}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => showPreview(t.body_html)} title="Preview">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className={cn('h-8 w-8', ['quote','invoice','pick_list'].includes(t.template_type) && 'text-blue-600 hover:text-blue-700 hover:bg-blue-50')} onClick={() => openEdit(t)} title={['quote','invoice','pick_list'].includes(t.template_type) ? 'Open Visual Builder' : 'Edit'}>
                      {['quote','invoice','pick_list'].includes(t.template_type) ? <Wand2 className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Template</AlertDialogTitle>
                          <AlertDialogDescription>Delete "{t.name}"? This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(t.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) { setEditing(null); setForm(empty); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Template Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard Quote" required />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.template_type} onValueChange={handleTypeChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes about this template" />
              </div>
            </div>

            <Separator />

            <div>
              <Label className="mb-2 block">Available Variables</Label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-muted/30 rounded-lg">
                {(VARIABLES[form.template_type] || []).map(v => (
                  <button
                    key={v}
                    type="button"
                    className="px-2 py-1 rounded-md bg-background border text-xs font-mono hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
                    onClick={() => setForm(f => ({ ...f, body_html: f.body_html + v }))}
                    title="Click to insert"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Click a variable to append it to the HTML body</p>
            </div>

            <div>
              <Label>HTML Body *</Label>
              <Textarea
                value={form.body_html}
                onChange={e => setForm(f => ({ ...f, body_html: e.target.value }))}
                className="font-mono text-xs min-h-64 mt-1.5"
                placeholder="<div>Your HTML template here...</div>"
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => showPreview(form.body_html)}>
                <Eye className="w-4 h-4 mr-1.5" /> Preview HTML
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {editing ? 'Save Changes' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col">
          <DocumentPreview
            html={previewHtml}
            title="Template Preview"
            onClose={() => setPreviewOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}