import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { MapPin, CalendarDays, User, Phone, Mail, ScanBarcode, FileText, ClipboardList, Download, Handshake, Package, CheckCircle2, Truck, Archive } from 'lucide-react';
import TruckPackSummary from '@/components/show/TruckPackSummary';
import { printPickList } from '@/lib/usePrintDocument';
import PickListPrint from '@/components/scan/PickListPrint';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import RoomPlanner from '@/components/show/RoomPlanner';
import ProjectCrewPanel from '@/components/show/ProjectCrewPanel';
import PostEventCostPanel from '@/components/show/PostEventCostPanel';
import AdditionalEquipmentApprovalPanel from '@/components/show/AdditionalEquipmentApprovalPanel';
import TravelLogisticsPanel from '@/components/show/TravelLogisticsPanel';
import ShowSubrentsPanel from '@/components/roundtable/ShowSubrentsPanel';
import ProjectBillingPanel from '@/components/show/ProjectBillingPanel';
import { usePermissions } from '@/lib/usePermissions';
import { useStatusFlow } from '@/lib/useStatusFlow';
import { normalizeStatusKey, canMoveForward } from '@/lib/projectStatusEngine';

export default function ShowDetail() {
  const { id: showId } = useParams();
  const queryClient = useQueryClient();

  const [pickListOpen, setPickListOpen] = useState(false);
  const { canAccessRoundtable, canScanPickShow, isDirectorOrAbove, level } = usePermissions();
  const statusFlow = useStatusFlow();
  
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: shows = [] } = useQuery({ queryKey: ['shows'], queryFn: () => base44.entities.Show.list('-start_date', 200) });
  const { data: showRecord = [] } = useQuery({
    queryKey: ['show', showId],
    queryFn: () => base44.entities.Show.filter({ id: showId }),
    enabled: !!showId,
  });
  const { data: brandList = [] } = useQuery({ queryKey: ['brand'], queryFn: () => base44.entities.BrandSettings.list() });
  const { data: allPrintTemplates = [] } = useQuery({ queryKey: ['printTemplates'], queryFn: () => base44.entities.PrintTemplate.list() });
  const pickListTemplates = allPrintTemplates.filter(t => t.template_type === 'pick_list');
  // Prefer the direct show fetch; fall back to show list cache
  const show = showRecord[0] || shows.find(s => s.id === showId);
  const brand = brandList[0] || {};

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.filter({}, '-created_date', 5000),
    refetchInterval: 5000,  // Sync every 5 sec to catch asset movements between shows/rooms
  });
  const { data: movements = [] } = useQuery({
    queryKey: ['showMovements', showId],
    queryFn: () => base44.entities.AssetMovement.filter({ show_id: showId }, '-created_date'),
    enabled: !!showId,
  });
  const { data: projectCrew = [] } = useQuery({
    queryKey: ['projectCrew', showId],
    queryFn: () => base44.entities.ProjectCrew.filter({ show_id: showId }),
    enabled: !!showId,
    refetchInterval: 15000,
  });
  const { data: postEventCosts = [] } = useQuery({
    queryKey: ['postEventCosts', showId],
    queryFn: () => base44.entities.PostEventCost.filter({ show_id: showId }),
    enabled: !!showId,
    refetchInterval: 15000,
  });
  const { data: allKits = [] } = useQuery({
    queryKey: ['kits'],
    queryFn: () => base44.entities.Kit.list(),
  });
  const { data: subrents = [] } = useQuery({
    queryKey: ['roundtable_subrents', showId],
    queryFn: () => base44.entities.RoundtableSubrent.filter({ show_id: showId }, '-created_date'),
    enabled: !!showId,
  });

  const { data: travelLogistics = [] } = useQuery({
    queryKey: ['travelLogistics', showId],
    queryFn: () => base44.entities.TravelLogistic.filter({ show_id: showId }, '-created_date'),
    enabled: !!showId,
  });

  const { data: showRequirements = [] } = useQuery({
    queryKey: ['show_requirements_detail', showId],
    queryFn: () => base44.entities.ShowRequirement.filter({ show_id: showId }),
    enabled: !!showId,
  });

  const { data: showFulfillments = [] } = useQuery({
    queryKey: ['show_fulfillments', showId],
    queryFn: () => base44.entities.ShowFulfillment.filter({ show_id: showId }),
    enabled: !!showId,
  });

  // Real-time sync — all project financial data streams update live
  useEffect(() => {
    const unsubs = [
      base44.entities.Asset.subscribe(() => queryClient.invalidateQueries({ queryKey: ['assets'] })),
      base44.entities.ShowFulfillment.subscribe(() => queryClient.invalidateQueries({ queryKey: ['show_fulfillments', showId] })),
      base44.entities.ProjectCrew.subscribe(() => queryClient.invalidateQueries({ queryKey: ['projectCrew', showId] })),
      base44.entities.PostEventCost.subscribe(() => queryClient.invalidateQueries({ queryKey: ['postEventCosts', showId] })),
      base44.entities.RoundtableSubrent.subscribe(() => queryClient.invalidateQueries({ queryKey: ['roundtable_subrents', showId] })),
      base44.entities.TravelLogistic.subscribe(() => queryClient.invalidateQueries({ queryKey: ['travelLogistics', showId] })),
      base44.entities.ShowRequirement.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['show_requirements_detail', showId] });
        queryClient.invalidateQueries({ queryKey: ['show_requirements_all', showId] });
        queryClient.invalidateQueries({ queryKey: ['showRequirements', showId] });
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [queryClient, showId]);

  // showAssets = all assets assigned to this show (for pick list, scanning, etc.)
  // roomedAssets = only assets placed in a VALID current room — stale room IDs that no
  // longer exist in show.sub_locations are excluded so deleted rooms don't inflate costing.
  const validRoomIdSet = new Set((show?.sub_locations || []).map(r => r.id));
  const showAssets = assets.filter(a => a.current_show_id === showId);
  const roomedAssets = showAssets.filter(
    a => a.current_sub_location_id && validRoomIdSet.has(a.current_sub_location_id)
  );
  const subLocations = show?.sub_locations || [];

  const assetsBySubLoc = {};
  subLocations.forEach(sl => { assetsBySubLoc[sl.id] = []; });
  showAssets.forEach(a => {
    if (a.current_sub_location_id && assetsBySubLoc[a.current_sub_location_id] !== undefined) {
      assetsBySubLoc[a.current_sub_location_id].push(a);
    }
  });

  const updateShowMutation = useMutation({
    mutationFn: (data) => base44.entities.Show.update(showId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows'] });
      queryClient.invalidateQueries({ queryKey: ['show', showId] });
    },
  });



  const moveAssetMutation = useMutation({
    mutationFn: ({ assetId, targetRoomId }) => base44.entities.Asset.update(assetId, { current_sub_location_id: targetRoomId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets'] }),
  });

  const handleAssetMove = (assetId, targetRoomId) => {
    moveAssetMutation.mutate({ assetId, targetRoomId });
  };

  const handleAssignAsset = (assetOrKitId, roomId, quantity = 1) => {
    const room = subLocations.find(r => r.id === roomId);
    if (!room) return;

    // Check if it's a kit or asset
    const isKit = allKits.some(k => k.id === assetOrKitId);
    
    if (isKit) {
      // Update kit with show and room assignment
      const kit = allKits.find(k => k.id === assetOrKitId);
      base44.entities.Kit.update(assetOrKitId, {
        current_show_id: showId,
        current_sub_location_id: roomId,
      }).then(() => {
        // For serialized (physical) kits, also assign the kit's contents to the room
        if (kit && kit.kit_type === 'serialized') {
          const kitContents = assets.filter(a => a.kit_id === assetOrKitId);
          kitContents.forEach(asset => {
            base44.entities.Asset.update(asset.id, {
              current_show_id: showId,
              current_sub_location_id: roomId,
              current_sub_location_name: room.name,
            });
          });
        }
        queryClient.invalidateQueries({ queryKey: ['kits'] });
        queryClient.invalidateQueries({ queryKey: ['assets'] });
      });
    } else {
      // Update asset
      const asset = assets.find(a => a.id === assetOrKitId);
      if (asset) {
        const assignmentHistory = asset.assignment_history || [];
        assignmentHistory.push({
          show_id: showId,
          show_name: show.name,
          room_id: roomId,
          room_name: room.name,
          assigned_at: new Date().toISOString(),
        });
        
        base44.entities.Asset.update(assetOrKitId, {
          current_show_id: showId,
          current_sub_location_id: roomId,
          current_sub_location_name: room.name,
          assignment_history: assignmentHistory,
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['assets'] });
        });
      }
    }
  };

  const handleRemoveAssetFromRoom = (assetId) => {
    // Remove just this asset from the room (clear sub-location only)
    base44.entities.Asset.update(assetId, {
      current_sub_location_id: null,
      current_sub_location_name: null,
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    });
  };

  const handleRemoveKitFromRoom = (kitId) => {
    base44.entities.Kit.update(kitId, {
      current_sub_location_id: null,
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
    });
  };

  // Calculate live project totals — derived entirely from live query data, never stale local state
  const projectTotals = useMemo(() => {
    // Equipment: use ShowRequirements (planned items) as the source of truth.
    // Each requirement has a daily_rate set when added from inventory catalog.
    // quantity_needed * daily_rate = billable; we have no internal cost at requirement stage so
    // treat daily_rate as both internal cost and billable (markup applied at quote stage).
    const equipmentInternal = showRequirements.reduce((sum, r) => sum + ((parseFloat(r.daily_rate) || 0) * (r.quantity_needed || 1)), 0);
    const equipmentBillable = showRequirements.reduce((sum, r) => sum + ((parseFloat(r.daily_rate) || 0) * (r.quantity_needed || 1)), 0);

    // Crew: pulled directly from ProjectCrew records for this show
    const crewInternalCost = projectCrew.reduce((sum, c) => sum + (parseFloat(c.internal_cost) || 0), 0);
    const crewBillableCost = projectCrew.reduce((sum, c) => sum + (parseFloat(c.billable_cost) || 0), 0);

    // Post-event: pulled directly from PostEventCost records for this show
    const postEventInternalCost = postEventCosts.reduce((sum, c) => sum + (parseFloat(c.total_internal_cost) || 0), 0);
    const postEventBillableCost = postEventCosts.reduce((sum, c) => sum + (parseFloat(c.total_billable_cost) || 0), 0);

    // Subrents: costs that reduce margin (not revenue)
    // Prefer internal_cost (new field); fall back to total_cost for backward compat
    const subrentsInternalCost = (subrents || []).reduce((sum, s) => sum + (parseFloat(s.internal_cost || s.total_cost) || 0), 0);
    // Billable portion of subrents added to revenue
    const subrentsBillable = (subrents || []).reduce((sum, s) => sum + (parseFloat(s.billable_amount) || 0), 0);

    // Travel & Logistics: cost field is internal cost; billable_amount if set
    const travelInternalCost = (travelLogistics || []).reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
    const travelBillable = (travelLogistics || []).reduce((sum, t) => sum + (parseFloat(t.billable_amount) || 0), 0);

    const totalInternalCost = equipmentInternal + crewInternalCost + postEventInternalCost + subrentsInternalCost + travelInternalCost;
    const totalBillable = equipmentBillable + crewBillableCost + postEventBillableCost + subrentsBillable + travelBillable;
    const margin = totalBillable - totalInternalCost;
    const markupPct = totalBillable > 0 ? (margin / totalBillable) * 100 : 0;

    return {
      equipmentInternal,
      equipmentBillable,
      crewInternalCost,
      crewBillableCost,
      postEventInternalCost,
      postEventBillableCost,
      subrentsInternalCost,
      subrentsBillable,
      travelInternalCost,
      travelBillable,
      totalInternalCost,
      totalBillable,
      margin,
      markupPct,
    };
  }, [showRequirements, projectCrew, postEventCosts, subrents, travelLogistics]);




  if (!show) return <div className="text-center py-20 text-muted-foreground">Loading...</div>;

  return (
    <div>

      <PageHeader
        title={show.name}
        description={show.client}
        actions={
          <div className="flex gap-2">
            <Link to={`/live/${showId}`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Live View
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => setPickListOpen(true)}>
              <ClipboardList className="w-4 h-4 mr-1.5" /> Pick List
            </Button>
            <Link to={`/quotes/${showId}`}>
              <Button size="sm"><FileText className="w-4 h-4 mr-1.5" /> Quote</Button>
            </Link>
            {canScanPickShow(normalizeStatusKey(show.status)) ? (
              <Link to={`/scan?show=${showId}`}>
                <Button variant="outline" size="sm"><ScanBarcode className="w-4 h-4 mr-2" /> Scan / Pick</Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled title={`Scan / Pick unlocks once the show is ${statusFlow.label('confirmed')}`}>
                <ScanBarcode className="w-4 h-4 mr-2" /> Scan / Pick
              </Button>
            )}
            <Select
              value={normalizeStatusKey(show.status)}
              onValueChange={v => updateShowMutation.mutate({ status: v, fulfillment_status: v })}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusFlow.enabledStatuses.map(s => (
                  <SelectItem key={s.key} value={s.key}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Info cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Show Info</h3>
          <div className="space-y-2 text-sm">
            {show.venue && <div className="flex gap-2"><MapPin className="w-4 h-4 text-muted-foreground shrink-0" /><span>{show.venue}</span></div>}
            <div className="flex gap-2"><CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>
                {!isNaN(new Date(show.start_date)) ? format(new Date(show.start_date), 'MMM d, yyyy') : show.start_date}
                {show.end_date && !isNaN(new Date(show.end_date)) ? ` — ${format(new Date(show.end_date), 'MMM d')}` : ''}
              </span>
            </div>
            {show.load_out_date && !isNaN(new Date(show.load_out_date)) && <div className="text-muted-foreground text-xs">Load out: {format(new Date(show.load_out_date), 'MMM d')}</div>}
            {show.return_date && !isNaN(new Date(show.return_date)) && <div className="text-muted-foreground text-xs">Return: {format(new Date(show.return_date), 'MMM d')}</div>}
            <div className="pt-1 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Invoice:</span>
              <Select value={show.invoice_status || 'uninvoiced'} onValueChange={v => updateShowMutation.mutate({ invoice_status: v })}>
                <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="uninvoiced">Uninvoiced</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Contact</h3>
          <div className="space-y-2 text-sm">
            {show.contact_name && <div className="flex gap-2"><User className="w-4 h-4 text-muted-foreground" /><span>{show.contact_name}</span></div>}
            {show.contact_phone && <div className="flex gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><span>{show.contact_phone}</span></div>}
            {show.contact_email && <div className="flex gap-2"><Mail className="w-4 h-4 text-muted-foreground" /><span>{show.contact_email}</span></div>}
            {!show.contact_name && <p className="text-muted-foreground">No contact info</p>}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Gear Status</h3>
          {(() => {
            // Derive display status from canonical show status
            const canonical = normalizeStatusKey(show.status);
            const fStatus = canonical === 'planning' ? 'planning' : canonical;

            // Use ShowRequirements if they exist, otherwise fall back to roomed assets only.
            // Unassigned/subrent assets must NOT inflate gear status counts.
            let totalReq, totalFulfilled;
            if (showRequirements.length > 0) {
              totalReq = showRequirements.reduce((s, r) => s + (r.quantity_needed || 1), 0);
              totalFulfilled = showRequirements.reduce((s, r) => {
                const count = showFulfillments.filter(f => f.requirement_id === r.id && f.movement_state !== 'returned').length;
                return s + Math.min(count, r.quantity_needed || 1);
              }, 0);
            } else {
              // Direct asset model — only count assets placed in a room
              totalReq = roomedAssets.length;
              totalFulfilled = showFulfillments.filter(f => f.movement_state !== 'returned').length;
            }

            return (
              <>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold">{totalFulfilled}</p>
                  <p className="text-muted-foreground">/ {totalReq} items</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">picked of {totalReq} assigned</p>
                <Badge
                  className={`mt-2 text-xs border ${statusFlow.className(fStatus) || ''}`}
                  style={!statusFlow.className(fStatus) ? statusFlow.style(fStatus) : undefined}
                >
                  {statusFlow.label(fStatus)}
                </Badge>
                {canonical === 'planning' && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <ScanBarcode className="w-3 h-3" /> Scan / Pick unlocks on {statusFlow.label('confirmed')}
                  </p>
                )}
                {subLocations.length > 0 && (
                  <div className="mt-3 space-y-1 border-t pt-2">
                    {subLocations.map(sl => {
                      if (showRequirements.length > 0) {
                        const roomReqs = showRequirements.filter(r => r.room_id === sl.id);
                        const roomTotal = roomReqs.reduce((s, r) => s + (r.quantity_needed || 1), 0);
                        return roomTotal > 0 ? (
                          <div key={sl.id} className="flex justify-between text-xs text-muted-foreground">
                            <span>{sl.name}</span>
                            <span className="font-medium">{roomTotal} needed</span>
                          </div>
                        ) : null;
                      } else {
                        const roomAssets = roomedAssets.filter(a => a.current_sub_location_id === sl.id);
                        return roomAssets.length > 0 ? (
                          <div key={sl.id} className="flex justify-between text-xs text-muted-foreground">
                            <span>{sl.name}</span>
                            <span className="font-medium">{roomAssets.length} assigned</span>
                          </div>
                        ) : null;
                      }
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </Card>
      </div>

      {/* Live Project Totals */}
      <Card className="mb-6 border-accent/20 bg-accent/5">
        <CardHeader>
          <CardTitle className="text-sm">Live Project Costing</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Cost breakdown row */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Equipment (Internal / Billable)</p>
              <p className="text-base font-semibold">
                <span className="text-muted-foreground">${projectTotals.equipmentInternal.toFixed(2)}</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span>${projectTotals.equipmentBillable.toFixed(2)}</span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Crew (Internal / Billable)</p>
              <p className="text-base font-semibold">
                <span className="text-muted-foreground">${projectTotals.crewInternalCost.toFixed(2)}</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span>${projectTotals.crewBillableCost.toFixed(2)}</span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Post-Event (Internal / Billable)</p>
              <p className="text-base font-semibold">
                <span className="text-muted-foreground">${projectTotals.postEventInternalCost.toFixed(2)}</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span>${projectTotals.postEventBillableCost.toFixed(2)}</span>
              </p>
            </div>
            {(projectTotals.travelInternalCost > 0 || projectTotals.travelBillable > 0) && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Travel & Logistics (Cost / Billable)</p>
                <p className="text-base font-semibold">
                  <span className="text-muted-foreground">${projectTotals.travelInternalCost.toFixed(2)}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span>${projectTotals.travelBillable.toFixed(2)}</span>
                </p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs text-amber-500 flex items-center gap-1"><Handshake className="w-3 h-3" /> Sub-Rents (Cost / Billable)</p>
              <p className="text-base font-semibold">
                <span className={projectTotals.subrentsInternalCost > 0 ? "text-red-400" : "text-muted-foreground"}>
                  -${projectTotals.subrentsInternalCost.toFixed(2)}
                </span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className={projectTotals.subrentsBillable > 0 ? "text-emerald-500" : "text-muted-foreground"}>
                  ${projectTotals.subrentsBillable.toFixed(2)}
                </span>
              </p>
            </div>
          </div>
          {/* Summary totals row */}
          <div className="border-t pt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Internal Total</p>
              <p className="text-xl font-bold">${projectTotals.totalInternalCost.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Billable Total</p>
              <p className="text-xl font-bold text-primary">${projectTotals.totalBillable.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Margin</p>
              <p className={`text-xl font-bold ${projectTotals.margin >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                ${projectTotals.margin.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gross Margin %</p>
              <p className={`text-xl font-bold ${projectTotals.markupPct >= 0 ? 'text-accent' : 'text-red-500'}`}>
                {projectTotals.markupPct.toFixed(0)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Equipment Requests */}
      <div className="mb-6">
        <AdditionalEquipmentApprovalPanel
          showId={showId}
          show={show}
          subLocations={subLocations}
          userRole={currentUser?.role}
          assets={assets}
        />
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="equipment" className="mb-6">
        <TabsList className="flex w-full overflow-x-auto h-auto p-1 gap-0.5">
          <TabsTrigger value="equipment" className="flex-1 text-xs px-3 py-1.5 whitespace-nowrap">Equipment</TabsTrigger>
          <TabsTrigger value="crew" className="flex-1 text-xs px-3 py-1.5 whitespace-nowrap">Crew</TabsTrigger>
          <TabsTrigger value="travel" className="flex-1 text-xs px-3 py-1.5 whitespace-nowrap">Travel</TabsTrigger>
          <TabsTrigger value="truck-pack" className="flex-1 text-xs px-3 py-1.5 whitespace-nowrap gap-1">
            <Truck className="w-3 h-3" /> Truck Pack
          </TabsTrigger>
          <TabsTrigger value="post-event" className="flex-1 text-xs px-3 py-1.5 whitespace-nowrap">Post-Event</TabsTrigger>
          <TabsTrigger value="billing" className="flex-1 text-xs px-3 py-1.5 whitespace-nowrap">Billing</TabsTrigger>
          {canAccessRoundtable && (
            <TabsTrigger value="roundtable" className="flex-1 text-xs px-3 py-1.5 whitespace-nowrap gap-1">
              <Handshake className="w-3 h-3" /> Roundtable
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="equipment" className="space-y-4">
          <RoomPlanner
            showId={showId}
            showName={show.name}
            show={show}
            subLocations={subLocations}
            onUpdateRooms={(updatedRooms) => updateShowMutation.mutate({ sub_locations: updatedRooms })}
          />
        </TabsContent>

        <TabsContent value="crew" className="space-y-4">
          <ProjectCrewPanel showId={showId} show={show} />
        </TabsContent>

        <TabsContent value="travel" className="space-y-4">
          <TravelLogisticsPanel showId={showId} show={show} />
        </TabsContent>

        <TabsContent value="truck-pack" className="space-y-4">
          <TruckPackSummary showId={showId} />
        </TabsContent>

        <TabsContent value="post-event" className="space-y-4">
          <PostEventCostPanel showId={showId} show={show} />
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <ProjectBillingPanel show={show} userRole={currentUser?.role} />
        </TabsContent>

        {canAccessRoundtable && (
          <TabsContent value="roundtable" className="space-y-4">
            <ShowSubrentsPanel showId={showId} showName={show.name} rooms={subLocations} />
          </TabsContent>
        )}
      </Tabs>

      {/* Pick List — fullscreen overlay with Master/Detailed mode selector */}
      {pickListOpen && (
        <PickListPrint
          show={show}
          requirements={showRequirements}
          fulfillments={showFulfillments}
          rooms={subLocations}
          onClose={() => setPickListOpen(false)}
        />
      )}
    </div>
  );
}