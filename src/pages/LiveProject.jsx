import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Package, MapPin, Clock, ScanBarcode, AlertCircle, AlertOctagon, Handshake } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';
import RoomAccordion from '@/components/live/RoomAccordion';
import BudgetSummary from '@/components/dashboard/BudgetSummary';
import CrewStatus from '@/components/dashboard/CrewStatus';
import EquipmentStatus from '@/components/dashboard/EquipmentStatus';
import { format } from 'date-fns';

function ShortageRow({ asset, assets, onResolve }) {
  const [resolution, setResolution] = useState('');
  return (
    <div className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{asset.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{asset.barcode}</p>
      </div>
      <Select value={resolution} onValueChange={v => { setResolution(v); onResolve(asset, v); }}>
        <SelectTrigger className="w-36 h-7 text-xs"><SelectValue placeholder="Resolve..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value="subrent">Subrent</SelectItem>
          <SelectItem value="swap">Swap from show</SelectItem>
          <SelectItem value="pending">Mark pending</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default function LiveProject() {
  const showId = window.location.pathname.split('/live/')[1];
  const queryClient = useQueryClient();

  const { data: shows = [] } = useQuery({
    queryKey: ['shows'],
    queryFn: () => base44.entities.Show.list(),
    staleTime: 0,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
  const { data: assets = [] } = useQuery({ queryKey: ['assets'], queryFn: () => base44.entities.Asset.list() });
  const { data: movements = [] } = useQuery({
    queryKey: ['showMovements', showId],
    queryFn: () => base44.entities.AssetMovement.filter({ show_id: showId }, '-created_date', 100),
    enabled: !!showId,
    refetchInterval: 10000,
  });
  const { data: projectCrew = [] } = useQuery({
    queryKey: ['projectCrew', showId],
    queryFn: () => base44.entities.ProjectCrew.filter({ show_id: showId }),
    enabled: !!showId,
  });
  const { data: postEventCosts = [] } = useQuery({
    queryKey: ['postEventCosts', showId],
    queryFn: () => base44.entities.PostEventCost.filter({ show_id: showId }),
    enabled: !!showId,
  });
  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list(),
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });
  const { data: subrents = [] } = useQuery({
    queryKey: ['roundtable_subrents', showId],
    queryFn: () => base44.entities.RoundtableSubrent.filter({ show_id: showId }, '-created_date'),
    enabled: !!showId,
  });

  const show = shows.find(s => s.id === showId);
  const subLocations = show?.sub_locations || [];
  const showAssets = assets.filter(a => a.current_show_id === showId);
  const quote = quotes.find(q => q.show_id === showId);

  // Calculate pack status
  // Use ShowFulfillments as source of truth for pack status (mirrors Scan page logic)
  const { data: showFulfillmentsLive = [] } = useQuery({
    queryKey: ['show_fulfillments', showId],
    queryFn: () => base44.entities.ShowFulfillment.filter({ show_id: showId }),
    enabled: !!showId,
    staleTime: 0,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
  const { data: showRequirementsLive = [] } = useQuery({
    queryKey: ['show_requirements_live', showId],
    queryFn: () => base44.entities.ShowRequirement.filter({ show_id: showId }),
    enabled: !!showId,
    staleTime: 0,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const activeLiveFulfillments = showFulfillmentsLive.filter(f => f.movement_state !== 'returned');
  const totalLiveRequired = showRequirementsLive.reduce((s, r) => s + (r.quantity_needed || 1), 0);
  const totalLiveFulfilled = showRequirementsLive.reduce((s, r) => {
    const count = activeLiveFulfillments.filter(f => f.requirement_id === r.id).length;
    return s + Math.min(count, r.quantity_needed || 1);
  }, 0);

  // Fall back to asset-based counting if no requirements defined
  const checkedOut = totalLiveRequired > 0 ? totalLiveFulfilled : showAssets.filter(a => a.status === 'checked_out').length;
  const packTotal = totalLiveRequired > 0 ? totalLiveRequired : showAssets.length;
  const packPct = packTotal ? Math.round((checkedOut / packTotal) * 100) : 0;

  const packStatus = packPct === 100 ? 'fully_packed' : packPct >= 75 ? 'mostly_packed' : packPct >= 25 ? 'partially_packed' : 'not_started';
  const packConfig = {
    fully_packed: { label: 'Fully Packed', color: 'text-emerald-600', bg: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    mostly_packed: { label: 'Mostly Packed', color: 'text-amber-600', bg: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    partially_packed: { label: 'Partially Packed', color: 'text-orange-600', bg: 'bg-orange-500', badge: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    not_started: { label: 'Not Started', color: 'text-muted-foreground', bg: 'bg-muted', badge: '' },
  };
  const statusCfg = packConfig[packStatus];

  // Critical alerts
  // Missing = requirements not yet fulfilled (or assets not checked out if no requirements)
  const missingItems = totalLiveRequired > 0
    ? showRequirementsLive.filter(r => {
        const count = activeLiveFulfillments.filter(f => f.requirement_id === r.id).length;
        return count < (r.quantity_needed || 1);
      })
    : showAssets.filter(a => a.status !== 'checked_out');
  const hasCriticalShortage = missingItems.length > 0;

  // Assets by sub-location
  const assetsByLoc = {};
  subLocations.forEach(sl => { assetsByLoc[sl.id] = { subLoc: sl, assets: [] }; });
  assetsByLoc['_unassigned'] = { subLoc: { name: 'Unassigned', type: '' }, assets: [] };
  showAssets.forEach(a => {
    const key = a.current_sub_location_id && assetsByLoc[a.current_sub_location_id] ? a.current_sub_location_id : '_unassigned';
    assetsByLoc[key].assets.push(a);
  });

  const updateShowMutation = useMutation({
    mutationFn: (data) => base44.entities.Show.update(showId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shows'] }),
  });

  const updateAssetMutation = useMutation({
    mutationFn: ({ assetId, newLocationId }) => base44.entities.Asset.update(assetId, { current_sub_location_id: newLocationId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets'] }),
  });

  const handleAssetMove = (assetId, targetRoomId) => {
    updateAssetMutation.mutate({ assetId, newLocationId: targetRoomId });
  };

  if (!show) return <div className="text-center py-20 text-muted-foreground">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">Live</span>
          <Link to="/scan"><Button variant="outline" size="sm"><ScanBarcode className="w-4 h-4 mr-1.5" /> Scan / Crew Mode</Button></Link>
        </div>
      </div>

      {/* Hero status bar */}
      <div className="bg-card border rounded-xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{show.name}</h1>
            {show.client && <p className="text-muted-foreground text-sm">{show.client}</p>}
            <div className="flex gap-2 mt-2 flex-wrap">
              <StatusBadge status={show.status} />
              <Badge variant="outline" className={statusCfg.badge}>{statusCfg.label}</Badge>
              {show.start_date && !isNaN(new Date(show.start_date)) && <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />{format(new Date(show.start_date), 'MMM d, yyyy')}</Badge>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={cn("text-4xl font-bold", statusCfg.color)}>{packPct}%</p>
            <p className="text-xs text-muted-foreground">{checkedOut} / {packTotal} packed</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-700", statusCfg.bg)} style={{ width: `${packPct}%` }} />
          </div>
        </div>
      </div>

      {/* Critical Alerts Dashboard */}
      {hasCriticalShortage && (
        <Card className="mb-6 border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-3 flex-row items-start justify-between space-y-0">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-red-500" />
              <CardTitle className="text-red-600">Critical Equipment Alert</CardTitle>
            </div>
            <Badge className="bg-red-500/20 text-red-600 border-red-500/30">{missingItems.length} items missing</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {missingItems.slice(0, 5).map((item, idx) => (
                <div key={item.id || idx} className="flex items-center justify-between p-2 bg-white/50 rounded border border-red-500/10">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-700">{item.product_name || item.name}</p>
                    <p className="text-xs text-red-600/70">{item.category} · {item.room_name || item.location || 'Unknown'}</p>
                  </div>
                  <Link to={`/live/${showId}?tab=missing`} className="text-xs text-primary hover:underline whitespace-nowrap ml-2">
                    Resolve →
                  </Link>
                </div>
              ))}
              {missingItems.length > 5 && (
                <p className="text-xs text-muted-foreground text-center py-2">+{missingItems.length - 5} more missing items</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{checkedOut}</p>
          <p className="text-xs text-muted-foreground mt-1">Packed Out</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{packTotal - checkedOut}</p>
          <p className="text-xs text-muted-foreground mt-1">Remaining</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{subLocations.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Locations</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{movements.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Scans Today</p>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="crew">Crew</TabsTrigger>
          <TabsTrigger value="equipment" className="gap-1.5">Equipment {subrents.length > 0 && <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">{subrents.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="rooms"><MapPin className="w-3.5 h-3.5 mr-1.5" />Rooms</TabsTrigger>
          <TabsTrigger value="missing"><AlertTriangle className="w-3.5 h-3.5 mr-1.5" />Missing ({missingItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(assetsByLoc).filter(([, { assets }]) => assets.length > 0).map(([key, { subLoc, assets: locAssets }]) => {
              const locCheckedOut = locAssets.filter(a => a.status === 'checked_out').length;
              const locPct = locAssets.length ? Math.round((locCheckedOut / locAssets.length) * 100) : 0;
              return (
                <Card key={key} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{subLoc.name}</span>
                      {subLoc.type && <Badge variant="outline" className="text-xs capitalize">{subLoc.type}</Badge>}
                    </div>
                    <span className={cn("text-sm font-semibold", locPct === 100 ? 'text-emerald-600' : 'text-amber-600')}>{locPct}%</span>
                  </div>
                  <Progress value={locPct} className="h-1.5 mb-2" />
                  <p className="text-xs text-muted-foreground">{locCheckedOut}/{locAssets.length} packed</p>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="budget">
          <BudgetSummary projectCrew={projectCrew} postEventCosts={postEventCosts} quote={quote} subrents={subrents} />
        </TabsContent>

        <TabsContent value="crew">
          <CrewStatus projectCrew={projectCrew} users={users} />
        </TabsContent>

        <TabsContent value="equipment">
          <div className="space-y-4">
            <EquipmentStatus assets={showAssets} quote={quote} />
            {subrents.length > 0 && (
              <>
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Handshake className="w-4 h-4" />Roundtable Subrents</h3>
                  <div className="space-y-2">
                    {subrents.map(sub => (
                      <Card key={sub.id} className="p-3 border-amber-500/20 bg-amber-500/5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{sub.item_name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                              <span>×{sub.quantity || 1}</span>
                              <span>·</span>
                              <span>${(parseFloat(sub.internal_cost || sub.total_cost) || 0).toFixed(2)}</span>
                              {sub.partner_name && <><span>·</span><span className="font-medium">{sub.partner_name}</span></>}
                              {sub.room_name && <><span>·</span><span>→ {sub.room_name}</span></>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Badge variant="outline" className="text-xs capitalize bg-amber-500/10 text-amber-700 border-amber-500/20">{sub.status || 'requested'}</Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="rooms">
          <RoomAccordion locations={subLocations} assets={showAssets} onAssetMove={handleAssetMove} />
        </TabsContent>

        <TabsContent value="missing">
           {missingItems.length === 0 ? (
             <Card className="p-12 text-center">
               <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
               <p className="font-semibold text-emerald-600">All items packed!</p>
             </Card>
           ) : (
             <div className="space-y-2">
               {missingItems.map((item, idx) => (
                 <div key={item.id || idx} className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                   <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                   <div className="flex-1">
                     <p className="font-medium text-sm">{item.product_name || item.name}</p>
                     <p className="text-xs text-muted-foreground">{item.category} · {item.room_name || item.location || 'Unknown location'}</p>
                   </div>
                   {(item.room_name || item.current_sub_location_name) && <Badge variant="outline" className="text-xs">{item.room_name || item.current_sub_location_name}</Badge>}
                   {!item.product_name && <StatusBadge status={item.status} />}
                   {item.product_name && (
                     <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                       {(() => {
                         const count = activeLiveFulfillments.filter(f => f.requirement_id === item.id).length;
                         return `${count}/${item.quantity_needed || 1} picked`;
                       })()}
                     </Badge>
                   )}
                 </div>
               ))}
             </div>
           )}
         </TabsContent>


        </Tabs>
    </div>
  );
}