import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Package, Cloud, Search, X, Layers, Printer } from 'lucide-react';
import QRLabelPrinter from '@/components/assets/QRLabelPrinter';
import CategorySelect from '@/components/shared/CategorySelect';

export default function KitEditDialog({ kit, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [qrPrinterOpen, setQrPrinterOpen] = useState(false);

  const isCloud = kit?.kit_type === 'cloud';

  const { data: allAssets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list('-created_date', 5000),
    enabled: open,
  });

  // Assets that belong to this kit
  const kitAssets = allAssets.filter(a => a.kit_id === kit?.id);

  // For cloud kits: linked asset IDs stored on kit via linked_asset_ids (stored on each asset with kit_id)
  // Search results for adding assets
  const searchResults = search.length > 1
    ? allAssets.filter(a =>
        !a.kit_id &&
        (a.name?.toLowerCase().includes(search.toLowerCase()) ||
         a.barcode?.toLowerCase().includes(search.toLowerCase()) ||
         a.asset_number?.toLowerCase().includes(search.toLowerCase()))
      ).slice(0, 8)
    : [];

  useEffect(() => {
    if (open && kit) {
      setForm({
        name: kit.name || '',
        barcode: kit.barcode || '',
        location: kit.location || '',
        daily_rate: kit.daily_rate != null ? String(kit.daily_rate) : '',
        notes: kit.notes || '',
        auto_price: kit.auto_price || false,
        is_sealed: kit.is_sealed || false,
        category: kit.category || '',
      });
      setSearch('');
    }
  }, [open, kit]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleAddAsset = async (asset) => {
    const updateData = { kit_id: kit.id };
    // For bulk tracking, decrement quantity like the main Kits page does
    if (asset.tracking === 'bulk') {
      updateData.quantity = (asset.quantity || 1) - 1;
    }
    await base44.entities.Asset.update(asset.id, updateData);
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    // Auto-price recompute if enabled
    if (form.auto_price) {
      const updatedAssets = allAssets.filter(a => a.kit_id === kit.id || a.id === asset.id);
      const total = updatedAssets.reduce((s, a) => s + (a.daily_rate || 0), 0);
      await base44.entities.Kit.update(kit.id, { daily_rate: total });
      queryClient.invalidateQueries({ queryKey: ['kits'] });
    }
    setSearch(''); // clear search but keep panel open
  };

  const handleRemoveAsset = async (asset) => {
    await base44.entities.Asset.update(asset.id, { kit_id: null });
    queryClient.invalidateQueries({ queryKey: ['assets'] });
  };

  const handleSave = async () => {
    setSaving(true);
    const autoPrice = isCloud && form.auto_price
      ? kitAssets.reduce((s, a) => s + (a.daily_rate || 0), 0)
      : null;

    await base44.entities.Kit.update(kit.id, {
      name: form.name.trim(),
      barcode: form.barcode?.trim() || undefined,
      location: form.location?.trim() || undefined,
      category: form.category?.trim() || undefined,
      daily_rate: form.auto_price && autoPrice != null ? autoPrice : (form.daily_rate !== '' ? Number(form.daily_rate) : undefined),
      notes: form.notes?.trim() || undefined,
      auto_price: form.auto_price,
      is_sealed: form.is_sealed,
    });
    queryClient.invalidateQueries({ queryKey: ['kits'] });
    setSaving(false);
    onOpenChange(false);
  };

  if (!kit) return null;

  const kitTypeLabel = isCloud ? 'Cloud Kit' : 'Physical Kit';
  const KitIcon = isCloud ? Cloud : Layers;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b bg-muted/20 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCloud ? 'bg-blue-500/10' : 'bg-purple-500/10'}`}>
            <KitIcon className={`w-4 h-4 ${isCloud ? 'text-blue-400' : 'text-purple-400'}`} />
          </div>
          <div>
            <h2 className="text-base font-bold">Edit {kitTypeLabel}</h2>
            <p className="text-xs text-muted-foreground">{kit.name}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Basic Info */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kit Details</p>
            <div>
              <Label>Kit Name *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. IEM Kit A" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {!isCloud && (
                <div>
                  <Label>Kit Scan Code / QR</Label>
                  <Input value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="e.g. KIT-001" />
                  <p className="text-xs text-muted-foreground mt-1">Printed on the outside of the case</p>
                </div>
              )}
              <div>
                <Label>Storage Location</Label>
                <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Warehouse" />
              </div>
              <div>
                <Label>Category</Label>
                <CategorySelect value={form.category} onChange={v => set('category', v)} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Daily Rate ($)</Label>
                {isCloud && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Auto-price from contents</span>
                    <Switch checked={form.auto_price} onCheckedChange={v => set('auto_price', v)} />
                  </div>
                )}
              </div>
              {isCloud && form.auto_price ? (
                <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-sm text-emerald-400">
                  Auto: ${kitAssets.reduce((s, a) => s + (a.daily_rate || 0), 0)}/day from {kitAssets.length} items
                </div>
              ) : (
                <Input
                  type="number" step="0.01" min="0"
                  value={form.daily_rate}
                  onChange={e => set('daily_rate', e.target.value)}
                  placeholder="0.00"
                />
              )}
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Optional..." />
            </div>

            {!isCloud && (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div>
                  <p className="text-sm font-medium">Sealed</p>
                  <p className="text-xs text-muted-foreground">Lock contents from editing</p>
                </div>
                <Switch checked={form.is_sealed} onCheckedChange={v => set('is_sealed', v)} />
              </div>
            )}
          </div>

          {/* Kit Contents */}
          <div className="space-y-3 border-t pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Kit Contents
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{kitAssets.length} items</Badge>
                {!searchOpen && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSearchOpen(true)}>
                    <Search className="w-3 h-3 mr-1" /> Add Items
                  </Button>
                )}
              </div>
            </div>

            {/* Add items — stays open until user closes */}
            {searchOpen && (
              <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search inventory to add…"
                      className="pl-9 h-9"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => { setSearchOpen(false); setSearch(''); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {searchResults.length > 0 && (
                  <div className="border rounded-md bg-background shadow-sm max-h-44 overflow-y-auto divide-y">
                    {searchResults.map(a => (
                      <div key={a.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40 cursor-pointer"
                        onClick={() => handleAddAsset(a)}>
                        <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm font-medium truncate">{a.name}</span>
                        {(a.asset_number || a.barcode) && (
                          <span className="text-xs text-muted-foreground font-mono shrink-0">{a.asset_number || a.barcode}</span>
                        )}
                        <span className="text-xs text-primary shrink-0">+ Add</span>
                      </div>
                    ))}
                  </div>
                )}
                {search.length > 1 && searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground px-1">No available items found for "{search}"</p>
                )}
              </div>
            )}

            {/* Current contents */}
            {kitAssets.length > 0 ? (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {kitAssets.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card">
                    <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      {a.barcode && (
                        <p className="text-xs text-muted-foreground font-mono truncate">{a.barcode}</p>
                      )}
                    </div>
                    {a.daily_rate && (
                      <span className="text-xs text-muted-foreground shrink-0">${a.daily_rate}/day</span>
                    )}
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 text-destructive/60 hover:text-destructive shrink-0"
                      onClick={() => handleRemoveAsset(a)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 text-center border-2 border-dashed rounded-lg text-muted-foreground">
                <Package className="w-6 h-6 mx-auto mb-1 opacity-30" />
                <p className="text-xs">No items linked to this kit yet. Search above to add.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/10 flex items-center justify-between gap-2">
          <div>
            {!isCloud && kit.barcode && (
              <Button variant="outline" size="sm" onClick={() => setQrPrinterOpen(true)}>
                <Printer className="w-4 h-4 mr-2" /> Print QR Label
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name?.trim()}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* QR Label Printer */}
      {kit && (
        <QRLabelPrinter
          open={qrPrinterOpen}
          onOpenChange={setQrPrinterOpen}
          assets={[{ id: kit.id, name: kit.name, barcode: kit.barcode, serial_numbers: kit.barcode }]}
        />
      )}
    </Dialog>
  );
}