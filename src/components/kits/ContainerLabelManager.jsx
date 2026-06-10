import React, { useState, useCallback, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Printer, RefreshCw, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { printWithTemplate } from '@/lib/printQRLabel';
import { useNavigate } from 'react-router-dom';

function generateLabelId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'CLB-';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export default function ContainerLabelManager({ kit, kitAssets = [] }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: labels = [] } = useQuery({
    queryKey: ['container-labels', kit.id],
    queryFn: () => db.entities.ContainerLabel.filter({ kit_id: kit.id }),
    enabled: open,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['printTemplates', 'qr_label'],
    queryFn: () => db.entities.PrintTemplate.filter({ template_type: 'qr_label' }),
    enabled: open,
  });

  const { data: brandList = [] } = useQuery({
    queryKey: ['brand'],
    queryFn: () => db.entities.BrandSettings.list(),
    staleTime: 10 * 60 * 1000,
    enabled: open,
  });
  const brand = brandList[0] || {};

  const activeLabel = labels.find(l => l.is_active);
  // On first load, select the default template or first available
  React.useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const defaultTemplate = templates.find(t => t.is_default);
      setSelectedTemplateId(defaultTemplate?.id || templates[0]?.id);
    }
  }, [templates, selectedTemplateId]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || null;
  const hasTemplate = !!selectedTemplate?.block_config?.length;

  const createMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(labels.filter(l => l.is_active).map(l =>
        db.entities.ContainerLabel.update(l.id, { is_active: false })
      ));
      return db.entities.ContainerLabel.create({
        label_id: generateLabelId(),
        kit_id: kit.id,
        kit_name: kit.name,
        notes,
        is_active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['container-labels', kit.id] });
      queryClient.invalidateQueries({ queryKey: ['container-labels'] });
      setNotes('');
    },
  });

  const handlePrint = (label) => {
    try {
      if (!selectedTemplate) {
        alert('No template selected');
        return;
      }
      if (!selectedTemplate.label_width_mm || !selectedTemplate.label_height_mm) {
        alert('Template missing dimensions. Edit the template to set exact size.');
        return;
      }
      
      console.log('[Kit Label] Printing with template:', selectedTemplate.name, `${selectedTemplate.label_width_mm}x${selectedTemplate.label_height_mm}mm`);
      
      db.entities.ContainerLabel.update(label.id, { printed_at: new Date().toISOString() });
      const assetLike = {
        id: label.id,
        name: kit.name,
        barcode: label.label_id,
        category: 'Kit Label',
        notes: label.notes || '',
      };
      printWithTemplate(assetLike, selectedTemplate, undefined, brand);
    } catch (err) {
      console.error('[Kit Label] Print error:', err);
      alert('Print failed: ' + (err.message || err));
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Tag className="w-3.5 h-3.5" />
        {activeLabel ? 'Container Label' : 'Add Label'}
        {activeLabel && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Container Label — {kit.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A scannable container label for this physical kit/case. Not a tracked asset — warehouse operations only.
            </p>

            {templates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">QR Label Template</Label>
                <Select value={selectedTemplateId || ''} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.name} {t.is_default ? '(default)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <button
                    className="text-xs underline text-primary hover:text-primary/80"
                    onClick={() => { setOpen(false); navigate(`/qr-label-builder?id=${selectedTemplate.id}`); }}
                  >
                    Edit template
                  </button>
                )}
              </div>
            )}

            {!hasTemplate && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div>
                  No QR label template found — a basic fallback layout will be used.{' '}
                  <button className="underline" onClick={() => { setOpen(false); navigate('/qr-label-builder'); }}>
                    Build a template
                  </button>
                </div>
              </div>
            )}

            {activeLabel ? (
              <div className="border rounded-lg p-4 bg-emerald-500/5 border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Active Label</p>
                    <p className="font-mono text-xl font-bold text-foreground">{activeLabel.label_id}</p>
                    {activeLabel.notes && <p className="text-xs text-muted-foreground mt-1">{activeLabel.notes}</p>}
                    {activeLabel.printed_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last printed: {new Date(activeLabel.printed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 gap-1.5" onClick={() => handlePrint(activeLabel)}>
                    <Printer className="w-3.5 h-3.5" /> Print Label
                  </Button>
                  <Button
                    size="sm" variant="outline" className="gap-1.5"
                    onClick={() => { if (confirm('Generate a new label ID? The old label will be deactivated.')) createMutation.mutate(); }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reissue
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                <p className="text-sm font-medium">No active label yet</p>
                <div>
                  <Label className="text-xs mb-1.5 block">Notes (optional)</Label>
                  <Input
                    placeholder="e.g. Black Pelican Case, Audio Rack 1..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <Button className="w-full gap-1.5" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                  <Plus className="w-3.5 h-3.5" />
                  {createMutation.isPending ? 'Generating...' : 'Generate Container Label'}
                </Button>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Kit Contents ({kitAssets.length} items)
              </p>
              {kitAssets.length === 0 ? (
                <p className="text-xs text-muted-foreground">No items in this kit yet.</p>
              ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {kitAssets.map(a => (
                    <div key={a.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-muted/40">
                      <span className="flex-1 font-medium">{a.name}</span>
                      {a.barcode && <span className="font-mono text-muted-foreground">{a.barcode}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
              <strong>How it works:</strong> Print and attach to your case. Scanning the QR in Scan page identifies the kit and its contents — no fake asset created.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}