import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, AlertTriangle, Package, GitCompare, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const HARD_OUT_STATES = new Set(['picked', 'on_truck', 'on_location', 'returning']);

export default function ShowCompare() {
  const [showAId, setShowAId] = useState('');
  const [showBId, setShowBId] = useState('');
  const [search, setSearch] = useState('');

  const { data: shows = [] } = useQuery({
    queryKey: ['shows'],
    queryFn: () => base44.entities.Show.list('-start_date', 200),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list('-name', 1000),
  });

  const { data: allRequirements = [] } = useQuery({
    queryKey: ['show_requirements_compare', showAId, showBId],
    queryFn: async () => {
      const ids = [showAId, showBId].filter(Boolean);
      if (ids.length === 0) return [];
      const all = await Promise.all(ids.map(id => base44.entities.ShowRequirement.filter({ show_id: id })));
      return all.flat();
    },
    enabled: !!(showAId || showBId),
  });

  const { data: allFulfillments = [] } = useQuery({
    queryKey: ['show_fulfillments_compare', showAId, showBId],
    queryFn: async () => {
      const ids = [showAId, showBId].filter(Boolean);
      if (ids.length === 0) return [];
      const all = await Promise.all(ids.map(id => base44.entities.ShowFulfillment.filter({ show_id: id })));
      return all.flat();
    },
    enabled: !!(showAId || showBId),
  });

  // Build asset lookup
  const assetById = useMemo(() => {
    const m = {};
    assets.forEach(a => { m[a.id] = a; });
    return m;
  }, [assets]);

  // Requirements grouped by show
  const reqsByShow = useMemo(() => {
    const m = { [showAId]: [], [showBId]: [] };
    allRequirements.forEach(r => {
      if (!m[r.show_id]) m[r.show_id] = [];
      m[r.show_id].push(r);
    });
    return m;
  }, [allRequirements, showAId, showBId]);

  // Fulfillments by show (active only — not returned)
  const activeFulfillsByShow = useMemo(() => {
    const m = {};
    allFulfillments.forEach(f => {
      if (!HARD_OUT_STATES.has(f.movement_state) && f.movement_state !== 'returned') return;
      if (f.movement_state === 'returned') return;
      if (!m[f.show_id]) m[f.show_id] = [];
      m[f.show_id].push(f);
    });
    return m;
  }, [allFulfillments]);

  /**
   * Build a merged list of all unique product names / asset_ids across both shows,
   * then for each — check if total demand exceeds total supply.
   *
   * Supply = asset.quantity (for bulk) or count of individual serialized assets with that name
   * Demand = sum of quantity_needed from both shows' requirements
   */
  const compareRows = useMemo(() => {
    if (!showAId && !showBId) return [];

    // Gather all product references from both shows
    const reqsA = reqsByShow[showAId] || [];
    const reqsB = reqsByShow[showBId] || [];

    // Build a map: assetId (or product_name key) -> { name, category, qtyA, qtyB, asset }
    const itemMap = {};

    const addReqs = (reqs, showKey) => {
      reqs.forEach(r => {
        const key = r.asset_id || `name:${r.product_name?.toLowerCase()}`;
        if (!itemMap[key]) {
          const asset = r.asset_id ? assetById[r.asset_id] : assets.find(a => a.name?.toLowerCase() === r.product_name?.toLowerCase());
          itemMap[key] = {
            key,
            asset_id: r.asset_id || asset?.id || null,
            name: r.product_name,
            category: r.category || asset?.category || '',
            asset,
            qtyA: 0,
            qtyB: 0,
          };
        }
        if (showKey === showAId) itemMap[key].qtyA += r.quantity_needed || 1;
        else itemMap[key].qtyB += r.quantity_needed || 1;
      });
    };

    addReqs(reqsA, showAId);
    addReqs(reqsB, showBId);

    return Object.values(itemMap).map(row => {
      const asset = row.asset;
      // Supply: for bulk/consumable → asset.quantity; for serialized or unknown → count of assets with same name
      let supply = 0;
      if (asset) {
        if (asset.tracking === 'bulk' || asset.tracking === 'consumable') {
          supply = asset.quantity ?? 0;
        } else {
          // serialized — count all assets with this name that are available or assigned
          supply = assets.filter(a =>
            a.name === asset.name &&
            a.status !== 'retired' &&
            a.status !== 'lost' &&
            !a.is_lost
          ).length;
        }
      } else {
        // Try fuzzy match by name
        supply = assets.filter(a =>
          a.name?.toLowerCase() === row.name?.toLowerCase() &&
          a.status !== 'retired' && !a.is_lost
        ).reduce((sum, a) => {
          if (a.tracking === 'bulk' || a.tracking === 'consumable') return sum + (a.quantity || 0);
          return sum + 1;
        }, 0);
      }

      const totalDemand = row.qtyA + row.qtyB;
      const canFulfill = supply >= totalDemand;
      const shortage = Math.max(0, totalDemand - supply);
      const onlyOneShow = (row.qtyA > 0) !== (row.qtyB > 0);

      return { ...row, supply, totalDemand, canFulfill, shortage, onlyOneShow };
    }).sort((a, b) => {
      // Conflicts first, then name
      if (!a.canFulfill && b.canFulfill) return -1;
      if (a.canFulfill && !b.canFulfill) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [showAId, showBId, reqsByShow, assetById, assets]);

  const filtered = useMemo(() => {
    if (!search) return compareRows;
    const s = search.toLowerCase();
    return compareRows.filter(r => r.name?.toLowerCase().includes(s) || r.category?.toLowerCase().includes(s));
  }, [compareRows, search]);

  const showA = shows.find(s => s.id === showAId);
  const showB = shows.find(s => s.id === showBId);

  const conflicts = compareRows.filter(r => !r.canFulfill && !r.onlyOneShow);
  const warnings = compareRows.filter(r => !r.canFulfill && r.onlyOneShow);
  const ok = compareRows.filter(r => r.canFulfill);

  const activeShows = useMemo(() => shows.filter(s =>
    ['planning', 'confirmed', 'load_out', 'on_site', 'strike'].includes(s.status)
  ), [shows]);

  return (
    <div className="space-y-4">
      {/* Show selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Show A</label>
          <Select value={showAId} onValueChange={setShowAId}>
            <SelectTrigger>
              <SelectValue placeholder="Select first show..." />
            </SelectTrigger>
            <SelectContent>
              {activeShows.map(s => (
                <SelectItem key={s.id} value={s.id} disabled={s.id === showBId}>
                  {s.name}{s.client ? ` — ${s.client}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Show B</label>
          <Select value={showBId} onValueChange={setShowBId}>
            <SelectTrigger>
              <SelectValue placeholder="Select second show..." />
            </SelectTrigger>
            <SelectContent>
              {activeShows.map(s => (
                <SelectItem key={s.id} value={s.id} disabled={s.id === showAId}>
                  {s.name}{s.client ? ` — ${s.client}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(!showAId && !showBId) && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <GitCompare className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">Select two shows to compare gear requirements</p>
          <p className="text-sm mt-1 opacity-70">The system will check if you have enough inventory to fulfill both shows simultaneously</p>
        </div>
      )}

      {(showAId || showBId) && compareRows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="w-10 h-10 mb-3 opacity-30" />
          <p>No gear requirements found for the selected show(s)</p>
          <p className="text-xs mt-1 opacity-60">Add requirements to shows via the Show Detail page</p>
        </div>
      )}

      {compareRows.length > 0 && (
        <>
          {/* Summary banner */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 border-rose-500/30 bg-rose-500/5">
              <div className="text-2xl font-bold text-rose-400">{conflicts.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Conflicts — shared gear, not enough supply</div>
            </Card>
            <Card className="p-3 border-amber-500/30 bg-amber-500/5">
              <div className="text-2xl font-bold text-amber-400">{warnings.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Short — only one show, but under stocked</div>
            </Card>
            <Card className="p-3 border-emerald-500/30 bg-emerald-500/5">
              <div className="text-2xl font-bold text-emerald-400">{ok.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">OK — sufficient inventory</div>
            </Card>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>

          {/* Gear table */}
          <Card className="overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_100px_80px_80px_80px_80px_100px] gap-0 border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <div className="px-3 py-2">Item</div>
              <div className="px-2 py-2 text-center">Category</div>
              <div className="px-2 py-2 text-center border-l border-amber-500/30 bg-amber-500/5 text-amber-600">
                {showA ? showA.name.slice(0, 8) + (showA.name.length > 8 ? '…' : '') : 'Show A'}
              </div>
              <div className="px-2 py-2 text-center border-l border-blue-500/30 bg-blue-500/5 text-blue-600">
                {showB ? showB.name.slice(0, 8) + (showB.name.length > 8 ? '…' : '') : 'Show B'}
              </div>
              <div className="px-2 py-2 text-center border-l">Total</div>
              <div className="px-2 py-2 text-center border-l">Supply</div>
              <div className="px-2 py-2 text-center border-l">Status</div>
            </div>

            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">No items match your search</div>
            )}

            {filtered.map((row, i) => {
              const isConflict = !row.canFulfill && !row.onlyOneShow;
              const isWarning = !row.canFulfill && row.onlyOneShow;

              return (
                <div
                  key={row.key}
                  className={cn(
                    "grid grid-cols-[1fr_100px_80px_80px_80px_80px_100px] gap-0 border-b last:border-b-0 text-sm items-center",
                    isConflict && "bg-rose-500/5",
                    isWarning && "bg-amber-500/5",
                    !isConflict && !isWarning && i % 2 === 0 && "bg-muted/10"
                  )}
                >
                  <div className="px-3 py-2">
                    <div className="font-medium truncate">{row.name}</div>
                    {row.asset && (
                      <div className="text-xs text-muted-foreground">
                        {row.asset.tracking === 'bulk' || row.asset.tracking === 'consumable'
                          ? `Bulk · qty in stock: ${row.asset.quantity ?? 0}`
                          : `Serialized`}
                      </div>
                    )}
                  </div>
                  <div className="px-2 py-2 text-center">
                    <span className="text-xs text-muted-foreground">{row.category || '—'}</span>
                  </div>
                  <div className="px-2 py-2 text-center border-l border-amber-500/20 bg-amber-500/5">
                    <span className={cn("font-semibold", row.qtyA > 0 ? "text-amber-500" : "text-muted-foreground/40")}>
                      {row.qtyA || '—'}
                    </span>
                  </div>
                  <div className="px-2 py-2 text-center border-l border-blue-500/20 bg-blue-500/5">
                    <span className={cn("font-semibold", row.qtyB > 0 ? "text-blue-500" : "text-muted-foreground/40")}>
                      {row.qtyB || '—'}
                    </span>
                  </div>
                  <div className="px-2 py-2 text-center border-l font-semibold">
                    {row.totalDemand}
                  </div>
                  <div className="px-2 py-2 text-center border-l">
                    <span className={cn(
                      "font-semibold",
                      row.supply >= row.totalDemand ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {row.supply}
                    </span>
                  </div>
                  <div className="px-2 py-2 text-center border-l">
                    {row.canFulfill ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" /> OK
                      </Badge>
                    ) : row.onlyOneShow ? (
                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" /> -{row.shortage}
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-xs">
                        <XCircle className="w-3 h-3 mr-1" /> -{row.shortage}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>

          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/20 rounded-lg border border-border/50">
            <p><span className="text-rose-400 font-semibold">Red conflict</span> = Both shows need this item and combined demand exceeds your supply. You'll need to subrent or reschedule.</p>
            <p><span className="text-amber-400 font-semibold">Yellow warning</span> = Only one show needs this item but your stock is still short of that show's requirement.</p>
            <p><span className="text-emerald-400 font-semibold">OK</span> = You have enough inventory to fulfill both shows simultaneously for this item.</p>
          </div>
        </>
      )}
    </div>
  );
}