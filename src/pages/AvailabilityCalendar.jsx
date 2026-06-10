import React, { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Package, Calendar, Filter, Info, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  format, isToday, parseISO, isWithinInterval, startOfDay, endOfDay
} from 'date-fns';
import { CALENDAR_TYPES } from '@/lib/itemTypes';
import ShowCompare from '@/components/availability/ShowCompare';

// movement_state values that mean the item is physically out / hard unavailable
const HARD_OUT_STATES = new Set(['picked', 'on_truck', 'on_location', 'returning']);
// movement_state that means returned back to warehouse
const RETURNED_STATE = 'returned';

function getShowDateRange(show) {
  const start = show.load_out_date
    ? parseISO(show.load_out_date)
    : show.start_date ? parseISO(show.start_date) : null;
  const end = show.return_date
    ? parseISO(show.return_date)
    : show.end_date ? parseISO(show.end_date) : null;
  return { start, end };
}

export default function AvailabilityCalendar() {
  const [tab, setTab] = useState('calendar'); // 'calendar' | 'compare'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tooltip, setTooltip] = useState(null);

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => db.entities.Asset.list('-name', 500),
    refetchInterval: 30000,
  });
  const { data: shows = [] } = useQuery({
    queryKey: ['shows'],
    queryFn: () => db.entities.Show.list(),
    refetchInterval: 30000,
  });
  const { data: fulfillments = [] } = useQuery({
    queryKey: ['showFulfillments'],
    queryFn: () => db.entities.ShowFulfillment.list('-scanned_at', 2000),
    refetchInterval: 30000,
  });
  const { data: requirements = [] } = useQuery({
    queryKey: ['showRequirements_calendar'],
    queryFn: () => db.entities.ShowRequirement.list('-created_date', 2000),
    refetchInterval: 60000,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => db.entities.Category.list(),
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Build lookups
  const showById = useMemo(() => {
    const map = {};
    shows.forEach(s => { map[s.id] = s; });
    return map;
  }, [shows]);

  // Build fulfillment lookup: assetId -> Map<showId, fulfillment> (most recent per show)
  const fulfillmentsByAsset = useMemo(() => {
    const map = {};
    fulfillments.forEach(f => {
      if (!map[f.asset_id]) map[f.asset_id] = {};
      const existing = map[f.asset_id][f.show_id];
      if (!existing || new Date(f.scanned_at) > new Date(existing.scanned_at)) {
        map[f.asset_id][f.show_id] = f;
      }
    });
    return map;
  }, [fulfillments]);

  /**
   * For bulk/consumable assets: requirements on a show also block inventory.
   * Build: showId -> [{ assetId, assetName, qty }]  — from ShowRequirements
   */
  const requirementsByShow = useMemo(() => {
    const map = {};
    requirements.forEach(r => {
      if (!r.show_id) return;
      if (!map[r.show_id]) map[r.show_id] = [];
      map[r.show_id].push(r);
    });
    return map;
  }, [requirements]);

  /**
   * calendarBlocks: assetId -> [{ showId, showName, client, start, end, blockType, movementState }]
   *
   * Sources of blocks (in priority):
   * 1. Fulfillment records with HARD_OUT_STATES → 'checked_out' (red)
   * 2. Fulfillment records with other states (not returned) → 'assigned' (yellow)
   * 3. asset.current_show_id / locked_to_show_id with no fulfillment → 'assigned'
   * 4. ShowRequirement referencing this asset on a planned show → 'planned' (yellow, lighter)
   */
  const calendarBlocks = useMemo(() => {
    const map = {};

    assets.forEach(asset => {
      const blocks = [];
      const assetFulfillments = fulfillmentsByAsset[asset.id] || {};

      // --- Source 1 & 2: Fulfillment records ---
      Object.values(assetFulfillments).forEach(f => {
        const show = showById[f.show_id];
        if (!show) return;
        const { start, end } = getShowDateRange(show);
        if (!start || !end) return;

        if (f.movement_state === RETURNED_STATE) return; // Available again

        if (HARD_OUT_STATES.has(f.movement_state)) {
          blocks.push({
            showId: show.id, showName: show.name, client: show.client,
            start, end, blockType: 'checked_out', movementState: f.movement_state,
          });
        } else {
          blocks.push({
            showId: show.id, showName: show.name, client: show.client,
            start, end, blockType: 'assigned', movementState: f.movement_state,
          });
        }
      });

      // --- Source 3: Asset fields ---
      const showAssignIds = new Set();
      if (asset.current_show_id) showAssignIds.add(asset.current_show_id);
      if (asset.locked_to_show_id) showAssignIds.add(asset.locked_to_show_id);

      showAssignIds.forEach(sid => {
        const alreadyHasBlock = blocks.some(b => b.showId === sid);
        if (alreadyHasBlock) return;
        const show = showById[sid];
        if (!show) return;
        const { start, end } = getShowDateRange(show);
        if (!start || !end) return;
        blocks.push({
          showId: show.id, showName: show.name, client: show.client,
          start, end, blockType: 'assigned', movementState: null,
        });
      });

      // --- Source 4: ShowRequirements (planned gear) ---
      // For serialized items, a matching requirement on a show means this specific unit is planned
      // (only meaningful for serialized; bulk is handled by quantity, not per-unit)
      if (asset.tracking === 'serialized' || !asset.tracking) {
        requirements.forEach(req => {
          if (!req.asset_id || req.asset_id !== asset.id) return;
          const alreadyHasBlock = blocks.some(b => b.showId === req.show_id);
          if (alreadyHasBlock) return;
          const show = showById[req.show_id];
          if (!show) return;
          // Only add for active/planned shows
          if (['completed', 'returned'].includes(show.status)) return;
          const { start, end } = getShowDateRange(show);
          if (!start || !end) return;
          blocks.push({
            showId: show.id, showName: show.name, client: show.client,
            start, end, blockType: 'planned', movementState: null,
          });
        });
      }

      if (blocks.length > 0) map[asset.id] = blocks;
    });

    return map;
  }, [assets, fulfillmentsByAsset, showById, requirements]);

  const getBlockForDay = (assetId, day) => {
    const blocks = calendarBlocks[assetId] || [];
    const dayStart = startOfDay(day);
    const matching = blocks.filter(b =>
      isWithinInterval(dayStart, { start: startOfDay(b.start), end: endOfDay(b.end) })
    );
    if (matching.length === 0) return null;
    // Priority: checked_out > assigned > planned
    return (
      matching.find(b => b.blockType === 'checked_out') ||
      matching.find(b => b.blockType === 'assigned') ||
      matching[0]
    );
  };

  // Filter assets
  const filteredAssets = useMemo(() => assets.filter(a => {
    if (!CALENDAR_TYPES.includes(a.item_type || 'physical_item')) return false;
    const matchSearch = !search ||
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.barcode?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'all' || a.category === categoryFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  }), [assets, search, categoryFilter, statusFilter]);

  // Group by category
  const grouped = useMemo(() => {
    const groups = {};
    filteredAssets.forEach(a => {
      const key = a.category || 'Uncategorized';
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    return groups;
  }, [filteredAssets]);

  // Summary stats
  const monthStats = useMemo(() => {
    let assigned = 0, checkedOut = 0, planned = 0;
    filteredAssets.forEach(a => {
      const blocks = calendarBlocks[a.id] || [];
      const hasInMonth = (block) => days.some(d =>
        isWithinInterval(startOfDay(d), { start: startOfDay(block.start), end: endOfDay(block.end) })
      );
      if (blocks.some(b => b.blockType === 'checked_out' && hasInMonth(b))) checkedOut++;
      else if (blocks.some(b => b.blockType === 'assigned' && hasInMonth(b))) assigned++;
      else if (blocks.some(b => b.blockType === 'planned' && hasInMonth(b))) planned++;
    });
    return { assigned, checkedOut, planned };
  }, [filteredAssets, calendarBlocks, days]);

  const stateLabel = {
    picked: 'Picked', on_truck: 'On Truck', on_location: 'On Location',
    returning: 'Returning', returned: 'Returned', null: 'Planned',
  };

  const blockColor = (block) => {
    if (!block) return '';
    if (block.blockType === 'checked_out') return 'bg-rose-500';
    if (block.blockType === 'assigned') return 'bg-amber-400';
    return 'bg-amber-200'; // planned (lighter)
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Availability
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Calendar view &amp; multi-show gear comparison
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'calendar' && (
            <>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => subMonths(d, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-sm min-w-[120px] text-center">{format(currentDate, 'MMMM yyyy')}</span>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addMonths(d, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
            </>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 bg-muted/30 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('calendar')}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            tab === 'calendar' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Calendar className="w-4 h-4" /> Calendar
        </button>
        <button
          onClick={() => setTab('compare')}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            tab === 'compare' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <GitCompare className="w-4 h-4" /> Show Compare
        </button>
      </div>

      {/* Compare tab */}
      {tab === 'compare' && <ShowCompare />}

      {/* Calendar tab */}
      {tab === 'calendar' && (
        <>
          {/* Filters */}
          <Card className="p-3 mb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="relative flex-1 min-w-[180px]">
                <Input
                  placeholder="Search assets..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  <SelectItem value="__none">Uncategorized</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="checked_out">Checked Out</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Legend + Stats */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-sm bg-amber-200 opacity-90" />
              <span className="text-muted-foreground">Planned (requirement only)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-sm bg-amber-400 opacity-90" />
              <span className="text-muted-foreground">Assigned / Scanned</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-sm bg-rose-500 opacity-90" />
              <span className="text-muted-foreground">Checked Out / On Show</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 opacity-90" />
              <span className="text-muted-foreground">Available</span>
            </div>
            <div className="ml-auto text-xs text-muted-foreground flex gap-3">
              <span className="font-medium text-amber-300">{monthStats.planned} planned</span>
              <span className="font-medium text-amber-500">{monthStats.assigned} assigned</span>
              <span className="font-medium text-rose-500">{monthStats.checkedOut} checked out</span>
              <span>{filteredAssets.length} assets</span>
            </div>
          </div>

          {/* Calendar grid */}
          <Card className="overflow-hidden relative">
            <div className="overflow-x-auto">
              <div style={{ minWidth: `${Math.max(700, 200 + days.length * 34)}px` }}>
                {/* Day header */}
                <div className="flex border-b bg-muted/40 sticky top-0 z-10">
                  <div className="w-48 shrink-0 px-3 py-2 text-xs font-semibold text-muted-foreground border-r">Asset</div>
                  {days.map(day => (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "flex-1 min-w-[32px] text-center py-2 border-r last:border-r-0 text-xs font-medium",
                        isToday(day) ? "bg-primary/10 text-primary" : "text-muted-foreground",
                        [0, 6].includes(day.getDay()) && "bg-muted/60"
                      )}
                    >
                      <div>{format(day, 'd')}</div>
                      <div className="text-[10px] opacity-70">{format(day, 'EEE')}</div>
                    </div>
                  ))}
                </div>

                {filteredAssets.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No assets match your filters</p>
                  </div>
                ) : (
                  Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([catName, catAssets]) => (
                    <div key={catName}>
                      <div className="flex items-center bg-muted/30 border-b px-3 py-1.5">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide w-48 shrink-0">{catName}</span>
                        <span className="text-xs text-muted-foreground">{catAssets.length} items</span>
                      </div>
                      {catAssets.map(asset => (
                        <div key={asset.id} className="flex border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                          <div className="w-48 shrink-0 px-3 py-1.5 border-r flex items-center gap-2">
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", {
                              'bg-emerald-500': asset.status === 'available',
                              'bg-rose-500': asset.status === 'checked_out',
                              'bg-amber-500': asset.status === 'maintenance',
                              'bg-slate-400': asset.status === 'retired',
                            })} />
                            <span className="text-xs font-medium truncate" title={asset.name}>{asset.name}</span>
                          </div>
                          {days.map(day => {
                            const block = getBlockForDay(asset.id, day);
                            const isWeekend = [0, 6].includes(day.getDay());
                            const isStart = block && format(startOfDay(block.start), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
                            const isEnd = block && format(startOfDay(block.end), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const isHovered = tooltip?.assetId === asset.id && tooltip?.dayStr === dayStr;

                            const color = blockColor(block);
                            const tooltipText = block
                              ? block.blockType === 'checked_out'
                                ? `${block.showName}${block.client ? ` · ${block.client}` : ''} — ${stateLabel[block.movementState] || block.movementState}`
                                : block.blockType === 'assigned'
                                  ? `${block.showName}${block.client ? ` · ${block.client}` : ''} — Assigned`
                                  : `${block.showName}${block.client ? ` · ${block.client}` : ''} — Planned (not yet scanned)`
                              : `${asset.name} — Available`;

                            return (
                              <div
                                key={day.toISOString()}
                                className={cn(
                                  "flex-1 min-w-[32px] border-r last:border-r-0 py-1.5 relative cursor-default",
                                  isWeekend && !block && "bg-muted/30",
                                  isToday(day) && !block && "bg-primary/5",
                                )}
                                title={tooltipText}
                                onMouseEnter={() => setTooltip({ assetId: asset.id, dayStr })}
                                onMouseLeave={() => setTooltip(null)}
                              >
                                {block && (
                                  <div className={cn(
                                    "absolute inset-y-1 opacity-85 transition-opacity",
                                    color,
                                    isHovered && "opacity-100",
                                    isStart ? "left-1 rounded-l" : "left-0",
                                    isEnd ? "right-1 rounded-r" : "right-0",
                                  )} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          {/* Info box */}
          <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-border/50 flex gap-3 text-xs text-muted-foreground">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <div className="space-y-1">
              <p><span className="text-amber-200 font-semibold">Light Yellow</span> = Gear is in a show's requirement list but not yet scanned/assigned.</p>
              <p><span className="text-amber-400 font-semibold">Yellow</span> = Assigned to a project or scanned into planning — still in warehouse.</p>
              <p><span className="text-rose-400 font-semibold">Red</span> = Picked, On Truck, On Location, or Returning — physically unavailable, hard lock.</p>
              <p><span className="text-emerald-400 font-semibold">No block</span> = Available. Includes items that have been returned from a show.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}