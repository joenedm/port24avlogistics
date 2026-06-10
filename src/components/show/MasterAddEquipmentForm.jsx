import React, { useState, useMemo } from 'react';
import { Package, Handshake, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import SubRentAddForm from './SubRentAddForm';

/**
 * Score a string against a query — broader first, exact second.
 * Returns a numeric score (higher = better match).
 */
function scoreMatch(str, query) {
  if (!str || !query) return 0;
  const s = str.toLowerCase();
  const q = query.toLowerCase();

  if (s === q) return 1000;              // exact
  if (s.startsWith(q)) return 500;       // prefix
  if (s.includes(q)) return 250;         // substring

  // Token-level match: does any word in the name start with or contain any query token?
  const nameTokens = s.split(/[\s\-_/]+/);
  const queryTokens = q.split(/[\s\-_/]+/);
  let tokenScore = 0;
  queryTokens.forEach(qt => {
    nameTokens.forEach(nt => {
      if (nt === qt) tokenScore += 80;
      else if (nt.startsWith(qt)) tokenScore += 50;
      else if (nt.includes(qt)) tokenScore += 25;
    });
  });
  if (tokenScore > 0) return tokenScore;

  // Fuzzy character sequence match (fallback)
  let j = 0;
  let fuzzy = 0;
  for (let i = 0; i < s.length && j < q.length; i++) {
    if (s[i] === q[j]) { fuzzy += 5; j++; }
  }
  return j === q.length ? fuzzy : 0;
}

/**
 * Master Equipment Add Form
 * - Search bar is ALWAYS at the top and always visible
 * - Shows all items when no search term entered
 * - Scores and ranks results as user types (broad → narrow)
 * - Supports initialMode prop to open directly in 'subrent' mode
 */
export default function MasterAddEquipmentForm({
  assets = [],
  kits = [],
  onAddOwned,
  onAddSubRent,
  onClose,
  initialMode = 'owned',
}) {
  const [mode, setMode] = useState(initialMode);
  const [ownedSearch, setOwnedSearch] = useState('');

  // Deduplicated owned catalog (assets + kits)
  const catalog = useMemo(() => {
    const seen = new Map();
    assets.forEach(a => {
      const key = a.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, {
          id: a.id,
          name: a.name,
          category: a.category,
          daily_rate: a.daily_rate,
          status: a.status,
          barcode: a.barcode,
        });
      }
    });
    kits.forEach(k => {
      const key = k.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, {
          id: k.id,
          name: k.name,
          category: 'Kit',
          daily_rate: k.daily_rate,
          kit_id: k.id,
          status: k.status,
          barcode: k.barcode,
        });
      }
    });
    return [...seen.values()];
  }, [assets, kits]);

  // Filtering + scoring
  const filtered = useMemo(() => {
    const q = ownedSearch.trim();
    if (!q) return catalog; // show ALL when no search

    // Score every item
    const scored = catalog.map(p => ({
      p,
      score: Math.max(
        scoreMatch(p.name, q),
        scoreMatch(p.category, q),
        scoreMatch(p.barcode, q)
      ),
    }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.p);

    return scored;
  }, [catalog, ownedSearch]);

  const handleSelectOwned = (product) => {
    onAddOwned({
      product_name: product.name,
      category: product.category,
      asset_id: product.kit_id ? undefined : product.id,
      kit_id: product.kit_id,
      daily_rate: product.daily_rate,
      quantity_needed: 1,
    });
  };

  return (
    <div className="border border-dashed border-border rounded-lg overflow-hidden bg-muted/10">
      {/* ── Persistent top toggle ── */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setMode('owned')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium transition-colors",
            mode === 'owned'
              ? "bg-primary/10 text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <Package className="w-3.5 h-3.5" />
          Owned Inventory
        </button>
        <button
          onClick={() => setMode('subrent')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium transition-colors border-l border-border",
            mode === 'subrent'
              ? "bg-amber-500/10 text-amber-500 border-b-2 border-amber-500"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <Handshake className="w-3.5 h-3.5" />
          Sub-Rent
        </button>
      </div>

      {/* ── Owned Inventory panel ── */}
      {mode === 'owned' && (
        <div className="p-4 space-y-3">
          {/* Search — always at top, always visible */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search products or kits… (shows all if empty)"
              value={ownedSearch}
              onChange={e => setOwnedSearch(e.target.value)}
              className="pl-7 h-8 text-sm"
              autoFocus
            />
          </div>

          {/* Results list — always shown */}
          <ScrollArea className="h-80">
            <div className="space-y-1">
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No products found</p>
              ) : filtered.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectOwned(p)}
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-secondary/60 text-left transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <div className="flex gap-2 items-center">
                      {p.category && <span className="text-xs text-muted-foreground">{p.category}</span>}
                      {p.kit_id && <span className="text-xs text-primary/70 font-medium">Kit</span>}
                    </div>
                  </div>
                  {p.daily_rate > 0 && (
                    <span className="text-xs text-muted-foreground shrink-0">${p.daily_rate}/day</span>
                  )}
                  <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
                </button>
              ))}
            </div>
          </ScrollArea>

          <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onClose}>
            Cancel
          </Button>
        </div>
      )}

      {/* ── Sub-Rent panel ── */}
      {mode === 'subrent' && (
        <div className="p-4 space-y-3">
          <SubRentAddForm
            onAdd={(data) => onAddSubRent(data)}
            onCancel={onClose}
          />
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onClose}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}