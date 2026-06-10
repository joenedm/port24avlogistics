import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Palette, Building2, Image, CheckCircle2, RefreshCw, Wand2 } from 'lucide-react';
import AutoBrandModal from '@/components/branding/AutoBrandModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import PageHeader from '@/components/shared/PageHeader';

export default function BrandingSettings() {
  const queryClient = useQueryClient();
  const { data: brandList = [], isLoading } = useQuery({
    queryKey: ['brand'],
    queryFn: () => db.entities.BrandSettings.list(),
  });

  const existing = brandList[0];
  const [form, setForm] = useState({
    company_name: '', logo_url: '',
    primary_color: '', accent_color: '', bg_color: '', card_color: '',
    sidebar_color: '', border_color: '',
    login_background_url: '', login_background_color: '',
    invoice_header_note: '', invoice_footer_note: '', quote_footer_note: '',
    default_tax_pct: 0, default_payment_terms: 'Net 30',
    company_email: '', company_phone: '',
  });
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [autoBrandOpen, setAutoBrandOpen] = useState(false);

  useEffect(() => {
    if (existing) setForm({ ...form, ...existing });
  }, [existing?.id]);

  const saveMutation = useMutation({
    mutationFn: (data) => existing
      ? db.entities.BrandSettings.update(existing.id, data)
      : db.entities.BrandSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await db.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, logo_url: file_url }));
    setUploadingLogo(false);
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingBg(true);
    const { file_url } = await db.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, login_background_url: file_url }));
    setUploadingBg(false);
  };

  const handleAutoBrandApply = (colors) => {
    setForm(f => ({ ...f, ...colors }));
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Branding & Customization" description="Customize how the system looks for your company" />

      <div className="space-y-6">
        {/* Company Identity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" /> Company Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Company Name</Label>
              <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Your Company Name" />
              <p className="text-xs text-muted-foreground mt-1">Appears in the navigation bar and documents</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Company Email</Label>
                <Input type="email" value={form.company_email} onChange={e => setForm(f => ({ ...f, company_email: e.target.value }))} placeholder="contact@company.com" />
              </div>
              <div>
                <Label>Company Phone</Label>
                <Input value={form.company_phone} onChange={e => setForm(f => ({ ...f, company_phone: e.target.value }))} placeholder="+1-555-0123" />
              </div>
            </div>
            <div>
              <Label>Company Logo</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.logo_url && (
                  <img src={form.logo_url} alt="Logo" className="h-12 max-w-32 object-contain rounded border bg-muted p-1" />
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <Button variant="outline" size="sm" disabled={uploadingLogo} asChild>
                    <span>{uploadingLogo ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Uploading...</> : <><Upload className="w-3.5 h-3.5 mr-1.5" />Upload Logo</>}</span>
                  </Button>
                </label>
                {form.logo_url && <Button variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, logo_url: '' }))}>Remove</Button>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">PNG or SVG recommended. Shows top-left in the app.</p>
            </div>
          </CardContent>
        </Card>

        {/* Theme Colors */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" /> Theme Colors</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoBrandOpen(true)}
                disabled={!form.logo_url}
                title={!form.logo_url ? 'Upload a company logo first' : 'Generate a theme from your logo'}
              >
                <Wand2 className="w-3.5 h-3.5 mr-1.5 text-primary" /> Auto Brand
              </Button>
              {!form.logo_url && (
                <span className="text-xs text-muted-foreground">Upload a logo to enable</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-xs text-muted-foreground -mt-1">
              Leave any field blank to use the default Port 24 Midnight + Teal theme. Changes apply immediately after saving.
            </p>

            {/* Live preview strip */}
            <div className="flex gap-1 h-8 rounded-lg overflow-hidden border">
              {[
                form.bg_color || '#0E1117',
                form.sidebar_color || form.bg_color || '#0B0F18',
                form.card_color || '#171D27',
                form.border_color || '#272F3E',
                form.primary_color || '#1FB8A0',
                form.accent_color || '#3DC9C0',
              ].map((c, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground -mt-2">
              <span className="flex-1 text-center">BG</span>
              <span className="flex-1 text-center">Sidebar</span>
              <span className="flex-1 text-center">Card</span>
              <span className="flex-1 text-center">Border</span>
              <span className="flex-1 text-center">Primary</span>
              <span className="flex-1 text-center">Accent</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'primary_color', label: 'Primary / Button Color', placeholder: '#1FB8A0', hint: 'Buttons, active nav, highlights' },
                { key: 'accent_color',  label: 'Accent Color',           placeholder: '#3DC9C0', hint: 'Secondary highlights' },
                { key: 'bg_color',      label: 'App Background',         placeholder: '#0E1117', hint: 'Main app background' },
                { key: 'card_color',    label: 'Card / Panel Color',     placeholder: '#171D27', hint: 'Cards and panels' },
                { key: 'sidebar_color', label: 'Sidebar Background',     placeholder: '#0B0F18', hint: 'Override sidebar bg separately' },
                { key: 'border_color',  label: 'Border / Divider Color', placeholder: '#272F3E', hint: 'Borders between panels' },
              ].map(({ key, label, placeholder, hint }) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={form[key] || placeholder}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-9 h-9 rounded cursor-pointer border shrink-0"
                    />
                    <Input
                      value={form[key] || ''}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="font-mono text-xs"
                      placeholder={placeholder}
                    />
                    {form[key] && (
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setForm(f => ({ ...f, [key]: '' }))}
                        title="Reset to default"
                      >✕</button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{hint}</p>
                </div>
              ))}
            </div>

            <div>
              <Label>Login Background Color (optional)</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.login_background_color || '#0E1117'} onChange={e => setForm(f => ({ ...f, login_background_color: e.target.value }))} className="w-9 h-9 rounded cursor-pointer border shrink-0" />
                <Input value={form.login_background_color} onChange={e => setForm(f => ({ ...f, login_background_color: e.target.value }))} className="w-36 font-mono text-xs" placeholder="#0E1117" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backgrounds */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Image className="w-4 h-4" /> Background Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Login Screen Background</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.login_background_url && (
                  <img src={form.login_background_url} alt="Login BG" className="h-16 w-28 object-cover rounded border" />
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
                  <Button variant="outline" size="sm" disabled={uploadingBg} asChild>
                    <span>{uploadingBg ? 'Uploading...' : <><Upload className="w-3.5 h-3.5 mr-1.5" />Upload Image</>}</span>
                  </Button>
                </label>
                {form.login_background_url && <Button variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, login_background_url: '' }))}>Remove</Button>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Or enter a URL directly:</p>
              <Input value={form.login_background_url} onChange={e => setForm(f => ({ ...f, login_background_url: e.target.value }))} placeholder="https://..." className="mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Documents & Invoices</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Default Tax %</Label>
                <Input type="number" value={form.default_tax_pct} onChange={e => setForm(f => ({ ...f, default_tax_pct: parseFloat(e.target.value) || 0 }))} min="0" />
              </div>
              <div>
                <Label>Default Payment Terms</Label>
                <Input value={form.default_payment_terms} onChange={e => setForm(f => ({ ...f, default_payment_terms: e.target.value }))} placeholder="e.g. Net 30" />
              </div>
            </div>
            <div>
              <Label>Invoice Header Note</Label>
              <Input value={form.invoice_header_note} onChange={e => setForm(f => ({ ...f, invoice_header_note: e.target.value }))} placeholder="e.g. Thank you for your business" />
            </div>
            <div>
              <Label>Invoice Footer Note</Label>
              <Input value={form.invoice_footer_note} onChange={e => setForm(f => ({ ...f, invoice_footer_note: e.target.value }))} placeholder="e.g. Payment due within 30 days" />
            </div>
            <div>
              <Label>Quote Footer Note</Label>
              <Input value={form.quote_footer_note} onChange={e => setForm(f => ({ ...f, quote_footer_note: e.target.value }))} placeholder="e.g. Quote valid for 30 days" />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="min-w-32">
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const reset = { primary_color: '', accent_color: '', bg_color: '', card_color: '', sidebar_color: '', border_color: '' };
              setForm(f => ({ ...f, ...reset }));
              if (existing) {
                saveMutation.mutate({ ...form, ...reset });
              }
            }}
            disabled={saveMutation.isPending}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Revert to Default Theme
          </Button>
          {saved && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Saved!
            </div>
          )}
        </div>
      </div>

      <AutoBrandModal
        open={autoBrandOpen}
        onClose={() => setAutoBrandOpen(false)}
        onApply={handleAutoBrandApply}
        logoUrl={form.logo_url}
      />
    </div>
  );
}