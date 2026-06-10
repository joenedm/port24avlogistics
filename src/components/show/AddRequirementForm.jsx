import React, { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AddRequirementForm({ assets = [], kits = [], onAdd, onClose }) {
  const [search, setSearch] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState(1);

  // Build a deduplicated product catalog from asset names
  const catalog = useMemo(() => {
    const seen = new Map();
    assets.forEach(a => {
      const key = a.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, { id: a.id, name: a.name, category: a.category, daily_rate: a.daily_rate });
      }
    });
    kits.forEach(k => {
      const key = k.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, { id: k.id, name: k.name, category: 'Kit', daily_rate: k.daily_rate, kit_id: k.id });
      }
    });
    return [...seen.values()];
  }, [assets, kits]);

  const filtered = search.trim()
    ? catalog.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.category || '').toLowerCase().includes(search.toLowerCase()))
    : catalog;

  const handleSelectProduct = (product) => {
    onAdd({
      product_name: product.name,
      category: product.category,
      asset_id: product.kit_id ? undefined : product.id,
      kit_id: product.kit_id,
      daily_rate: product.daily_rate,
      quantity_needed: 1,
    });
  };

  const handleManualAdd = () => {
    if (!manualName.trim()) return;
    onAdd({ product_name: manualName.trim(), quantity_needed: parseInt(manualQty) || 1 });
    setManualName('');
    setManualQty(1);
  };

  return (
    <div className="border border-dashed border-border rounded-lg p-4 space-y-3 bg-muted/20">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Requirement</p>

      {/* Search from catalog */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search products or kits..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-7 h-8 text-sm"
          autoFocus
        />
      </div>

      {search.trim() && (
        <ScrollArea className="max-h-48">
          <div className="space-y-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No products found</p>
            ) : filtered.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSelectProduct(p)}
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-secondary/60 text-left transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  {p.category && <span className="text-xs text-muted-foreground">{p.category}</span>}
                </div>
                {p.daily_rate > 0 && <span className="text-xs text-muted-foreground shrink-0">${p.daily_rate}/day</span>}
                <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
              </button>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Divider */}
      <div className="relative flex items-center gap-2">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground">or add manually</span>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* Manual entry */}
      <div className="flex gap-2">
        <Input
          placeholder="Product name..."
          value={manualName}
          onChange={e => setManualName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
          className="h-8 text-sm flex-1"
        />
        <Input
          type="number"
          min="1"
          value={manualQty}
          onChange={e => setManualQty(e.target.value)}
          className="h-8 text-sm w-16"
        />
        <Button size="sm" onClick={handleManualAdd} disabled={!manualName.trim()}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onClose}>
        Cancel
      </Button>
    </div>
  );
}