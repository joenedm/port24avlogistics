import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Trash2, FileText, Send, Eye, EyeOff, ChevronDown, ChevronRight, Percent, PanelRightOpen, PanelRightClose, Users, Package, LayoutTemplate, Download, Lock, LockOpen, CheckCircle, AlertTriangle, Handshake, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { nanoid } from '@/lib/nanoid';
import DocumentPreview from '@/components/documents/DocumentPreview';
import { renderQuoteTemplate } from '@/lib/quoteTemplateRenderer';
import { printQuote } from '@/lib/usePrintDocument';

function calcLineTotal(item) {
  const base = item.override_price != null
    ? parseFloat(item.override_price)
    : (parseFloat(item.daily_rate) || 0) * (parseFloat(item.days) || 1) * (parseFloat(item.quantity) || 1);
  const disc = item.discount_pct ? base * (item.discount_pct / 100) : 0;
  return base - disc;
}

export default function QuoteBuilder() {
  const showId = window.location.pathname.split('/quotes/')[1];
  const queryClient = useQueryClient();

  const { data: shows = [] } = useQuery({ queryKey: ['shows'], queryFn: () => base44.entities.Show.list() });
  const { data: allAssets = [] } = useQuery({ queryKey: ['assets'], queryFn: () => base44.entities.Asset.list('-created_date', 5000) });
  const { data: quotes = [] } = useQuery({ queryKey: ['quotes'], queryFn: () => base44.entities.Quote.list() });
  const { data: brandList = [] } = useQuery({ queryKey: ['brand'], queryFn: () => base44.entities.BrandSettings.list() });
  const { data: projectCrewList = [] } = useQuery({
    queryKey: ['projectCrew', showId],
    queryFn: () => base44.entities.ProjectCrew.filter({ show_id: showId }),
    enabled: !!showId,
  });
  const { data: allPrintTemplates = [] } = useQuery({
    queryKey: ['printTemplates'],
    queryFn: () => base44.entities.PrintTemplate.list(),
  });
  const printTemplates = allPrintTemplates.filter(t => t.template_type === 'quote');

  const { data: subrents = [] } = useQuery({
    queryKey: ['roundtable_subrents', showId],
    queryFn: () => base44.entities.RoundtableSubrent.filter({ show_id: showId }),
    enabled: !!showId,
  });

  const { data: travelLogistics = [] } = useQuery({
    queryKey: ['travelLogistics', showId],
    queryFn: () => base44.entities.TravelLogistic.filter({ show_id: showId }),
    enabled: !!showId,
  });

  // Live project requirements — the true source of truth for what should be quoted
  const { data: showRequirements = [], isSuccess: requirementsLoaded } = useQuery({
    queryKey: ['showRequirements', showId],
    queryFn: () => base44.entities.ShowRequirement.filter({ show_id: showId }),
    enabled: !!showId,
    staleTime: 0,
  });

  const brand = brandList[0] || {};
  const show = shows.find(s => s.id === showId);
  const existingQuote = quotes.find(q => q.show_id === showId);
  // Only assets that are physically roomed in this show — never unassigned/subrent placeholders
  const showAssets = allAssets.filter(
    a => a.current_show_id === showId && a.current_sub_location_id
  );
  const rooms = show?.sub_locations || [];

  const [items, setItems] = useState([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [taxPct, setTaxPct] = useState(brand.default_tax_pct || 0);
  const [notes, setNotes] = useState('');
  const [showDailyBreakdown, setShowDailyBreakdown] = useState(true);
  const [includeSubrents, setIncludeSubrents] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState('draft');
  const [collapsedRooms, setCollapsedRooms] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemRoomId, setAddItemRoomId] = useState('__unassigned__');
  const [newItem, setNewItem] = useState({ name: '', days: 1, daily_rate: 0, quantity: 1 });
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [revertModalOpen, setRevertModalOpen] = useState(false);

  const isLocked = existingQuote?.is_locked === true;
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  // One-time seed of quote-level settings from saved quote
  useEffect(() => {
    if (existingQuote) {
      setDiscountPct(existingQuote.discount_pct || 0);
      setTaxPct(existingQuote.tax_pct || 0);
      setNotes(existingQuote.notes || '');
      setShowDailyBreakdown(existingQuote.show_daily_breakdown !== false);
      setQuoteStatus(existingQuote.status || 'draft');
      if (existingQuote.template_id) setSelectedTemplateId(existingQuote.template_id);
    }
  }, [existingQuote?.id]);

  // Whenever requirements load, purge any ShowRequirements whose room_id no longer
  // exists on the show. These are orphaned records left behind by deleted rooms.
  useEffect(() => {
    if (!show || !requirementsLoaded || showRequirements.length === 0) return;
    const validRoomIds = new Set((show?.sub_locations || []).map(r => r.id));
    const orphaned = showRequirements.filter(
      r => r.room_id && !validRoomIds.has(r.room_id)
    );
    if (orphaned.length === 0) return;
    // Delete orphaned requirements silently, then invalidate so quote rebuilds clean
    Promise.all(orphaned.map(r => base44.entities.ShowRequirement.delete(r.id))).then(() => {
      queryClient.invalidateQueries({ queryKey: ['showRequirements', showId] });
      queryClient.invalidateQueries({ queryKey: ['show_requirements_detail', showId] });
      queryClient.invalidateQueries({ queryKey: ['show_requirements_all', showId] });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirementsLoaded, show?.id, JSON.stringify((show?.sub_locations || []).map(r => r.id).sort())]);

  // Build quote line items from the LIVE project plan (ShowRequirements).
  // Saved quote pricing overrides (rate, days, discount, override_price, is_hidden)
  // are merged in by requirement id/asset_id so manual edits are preserved.
  // If requirements are empty → items are empty (no stale cached rows).
  useEffect(() => {
    // Wait until requirements query has actually resolved (not just defaulted to [])
    if (!show || !requirementsLoaded) return;
    // showRequirements is the source of truth for WHICH items exist on the quote.
    // If no requirements exist, the quote should be empty.
    const showDays = show?.end_date && show?.start_date
      ? Math.max(1, Math.ceil((new Date(show.end_date) - new Date(show.start_date)) / 86400000))
      : 1;

    // Build a lookup of saved pricing overrides keyed by requirement_id or asset_id
    const savedMap = {};
    (existingQuote?.line_items || []).forEach(item => {
      if (item.requirement_id) savedMap[item.requirement_id] = item;
      else if (item.asset_id) savedMap[item.asset_id] = item;
    });

    // Build a set of valid room IDs from the CURRENT show sub_locations
    const validRoomIds = new Set((show?.sub_locations || []).map(r => r.id));

    // Map each live requirement into a line item, merging saved pricing if present.
    // If the requirement's room_id no longer exists in the current show rooms,
    // rebucket it to __unassigned__ so deleted rooms never appear as sections.
    const liveItems = showRequirements.map(req => {
      const saved = savedMap[req.id] || savedMap[req.asset_id] || null;
      const assetRecord = allAssets.find(a => a.id === req.asset_id);
      const baseRate = req.daily_rate ?? assetRecord?.daily_rate ?? 0;
      // Only use the requirement's room_id if that room still exists on the project
      const resolvedRoomId = req.room_id && validRoomIds.has(req.room_id)
        ? req.room_id
        : '__unassigned__';
      return {
        id: saved?.id || nanoid(),
        requirement_id: req.id,
        asset_id: req.asset_id || null,
        name: req.product_name || assetRecord?.name || 'Unknown',
        category: req.category || assetRecord?.category || '',
        quantity: saved?.quantity ?? req.quantity_needed ?? 1,
        days: saved?.days ?? showDays,
        daily_rate: saved?.daily_rate ?? baseRate,
        override_price: saved?.override_price ?? undefined,
        discount_pct: saved?.discount_pct ?? 0,
        room_id: resolvedRoomId,
        is_hidden: saved?.is_hidden ?? false,
        notes: saved?.notes ?? req.notes ?? undefined,
        group_name: resolvedRoomId !== '__unassigned__'
          ? (show?.sub_locations?.find(r => r.id === resolvedRoomId)?.name || saved?.group_name)
          : undefined,
      };
    });

    // Preserve truly manual items: items with no requirement_id AND no asset_id
    // AND whose name doesn't match any live requirement (to prevent ghost duplicates).
    // Items that have an asset_id or requirement_id were sourced from the project plan —
    // if those requirements are now gone, the items must NOT survive.
    const liveReqNames = new Set(showRequirements.map(r => (r.product_name || '').toLowerCase().trim()));
    const manualItems = (existingQuote?.line_items || [])
      .filter(i => {
        if (i.requirement_id || i.asset_id) return false; // came from project plan — discard if req gone
        // Also drop items whose name matches a current live requirement (would be a duplicate)
        const nameLower = (i.name || '').toLowerCase().trim();
        if (nameLower && liveReqNames.has(nameLower)) return false;
        return true;
      })
      .map(i => ({
        ...i,
        room_id: i.room_id && validRoomIds.has(i.room_id) ? i.room_id : '__unassigned__',
      }));

    setItems([...liveItems, ...manualItems]);
  // Re-run whenever requirements resolve, rooms change, or quote/show/assets change.
  // Use full requirement fingerprint (not just .length) so room reassignments are detected.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirementsLoaded, existingQuote?.id, show?.id,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(showRequirements.map(r => ({ id: r.id, room_id: r.room_id, product_name: r.product_name, quantity_needed: r.quantity_needed })).sort((a,b) => a.id > b.id ? 1 : -1)),
      JSON.stringify((show?.sub_locations || []).map(r => r.id).sort())]);

  // Auto-select default template if none chosen
  useEffect(() => {
    if (!selectedTemplateId && printTemplates.length > 0) {
      const def = printTemplates.find(t => t.is_default) || printTemplates[0];
      setSelectedTemplateId(def.id);
    }
  }, [printTemplates, selectedTemplateId]);

  const selectedTemplate = printTemplates.find(t => t.id === selectedTemplateId) || null;

  // Build room-based grouping — only rooms that exist in the show definition
  const allRooms = useMemo(() => {
    const base = rooms.length > 0 ? [...rooms] : [];
    base.push({ id: '__unassigned__', name: 'General Show' });
    return base;
  }, [rooms]);

  const itemsByRoom = useMemo(() => {
    const map = {};
    allRooms.forEach(r => { map[r.id] = []; });
    items.forEach(item => {
      const rid = item.room_id || '__unassigned__';
      if (map[rid]) map[rid].push(item);
      else map['__unassigned__'].push(item);
    });
    return map;
  }, [items, allRooms]);

  const crewByRoom = useMemo(() => {
    const map = {};
    allRooms.forEach(r => { map[r.id] = []; });
    projectCrewList.forEach(crew => {
      const rid = crew.sub_location_id || '__unassigned__';
      if (map[rid]) map[rid].push(crew);
      else map['__unassigned__'].push(crew);
    });
    return map;
  }, [projectCrewList, allRooms]);

  // Subrent line items derived from RoundtableSubrent records (not ShowRequirements)
  const subrentLineItems = useMemo(() => subrents.map(s => ({
    id: `subrent_${s.id}`,
    _isSubrent: true,
    subrent_id: s.id,
    name: s.item_name,
    partner_name: s.partner_name,
    room_id: s.room_id || '__unassigned__',
    quantity: s.quantity || 1,
    days: 1,
    daily_rate: parseFloat(s.billable_amount) || 0,
    override_price: parseFloat(s.billable_amount) || 0,
    discount_pct: 0,
    is_hidden: false,
  })), [subrents]);

  // Rooms that actually have items or crew — used to avoid rendering ghost sections
  const activeRooms = useMemo(() => {
    return allRooms.filter(r => {
      const hasItems = (itemsByRoom[r.id] || []).length > 0;
      const hasSubrents = includeSubrents && subrentLineItems.some(s => (s.room_id || '__unassigned__') === r.id);
      return hasItems || hasSubrents;
    });
  }, [allRooms, itemsByRoom, includeSubrents, subrentLineItems]);

  const subtotal = items.filter(i => !i.is_hidden).reduce((s, i) => s + calcLineTotal(i), 0)
    + (includeSubrents ? subrentLineItems.reduce((s, i) => s + (parseFloat(i.override_price) || 0), 0) : 0);
  const discountAmount = subtotal * (discountPct / 100);
  const taxAmount = (subtotal - discountAmount) * (taxPct / 100);
  const total = subtotal - discountAmount + taxAmount;

  // Build real data shaped for renderQuoteTemplate — recomputes on every relevant state change
  const templateData = useMemo(() => {
    const roomsData = allRooms.map(room => ({
      id: room.id,
      name: room.name,
      items: (itemsByRoom[room.id] || []).filter(i => !i.is_hidden),
    })).filter(r => r.items.length > 0);
    return {
      show: show || {},
      quote: {
        line_items: items,
        discount_pct: discountPct,
        tax_pct: taxPct,
        notes,
        status: quoteStatus,
        valid_until: existingQuote?.valid_until,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total,
      },
      rooms: roomsData,
      crew: projectCrewList,
      travel: travelLogistics,
    };
  }, [items, discountPct, taxPct, notes, quoteStatus, show, projectCrewList, allRooms, itemsByRoom, existingQuote, subtotal, discountAmount, taxAmount, total]);

  const previewHTML = useMemo(() => {
    const blocks = selectedTemplate?.block_config;
    const hasBlocks = blocks && blocks.length > 0;
    const activeBlocks = hasBlocks ? blocks : [
      { type: 'header', config: { companyName: brand?.company_name || '', logoUrl: brand?.logo_url || '', bgColor: '#1e293b', textColor: '#ffffff', paddingV: 36 }, style: {} },
      { type: 'info_row', style: {} },
      { type: 'room_section', config: { roomHeaderBg: 'linear-gradient(135deg,#1e293b,#334155)', roomHeaderColor: '#ffffff', showRoomTotal: true }, style: {} },
      { type: 'crew_section', title: 'Crew / Labor', config: {}, style: {} },
      { type: 'travel_section', title: 'Travel & Transport', config: {}, style: {} },
      { type: 'totals', title: 'Summary', config: { align: 'right' }, style: {} },
      { type: 'notes', title: 'Notes & Terms', config: {}, style: {} },
      { type: 'footer', config: {}, style: {} },
    ];
    try {
      return renderQuoteTemplate(activeBlocks, templateData, brand);
    } catch (e) {
      return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;color:#ef4444;"><h2>Template failed to render</h2><p style="color:#64748b;font-size:13px;">${e.message}</p></body></html>`;
    }
  }, [selectedTemplate, templateData, brand]);

  const saveMutation = useMutation({
    mutationFn: (data) => existingQuote
      ? base44.entities.Quote.update(existingQuote.id, data)
      : base44.entities.Quote.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });

  const handleSave = (status = quoteStatus) => {
    // Persist only pricing-override fields alongside the requirement reference.
    // The system will re-sync item existence from ShowRequirements on next load,
    // so we don't need to store the full denormalized set — just the overrides.
    const itemsToSave = items.map(({ id, requirement_id, asset_id, quantity, days, daily_rate, override_price, discount_pct, is_hidden, notes, room_id, group_name, name, category }) => ({
      id, requirement_id, asset_id, quantity, days, daily_rate, override_price, discount_pct, is_hidden, notes, room_id, group_name, name, category,
    }));
    saveMutation.mutate({
      show_id: showId, show_name: show?.name || '', client: show?.client || '',
      line_items: itemsToSave, status, discount_pct: discountPct, discount_amount: discountAmount,
      tax_pct: taxPct, tax_amount: taxAmount, subtotal, total, notes, show_daily_breakdown: showDailyBreakdown,
      template_id: selectedTemplateId || null,
    });
    setQuoteStatus(status);
  };

  const handleConfirmQuote = async () => {
    const now = new Date().toISOString();
    const snapshotObj = {
      line_items: items,
      travel_items: existingQuote?.travel_items || [],
      crew_snapshot: projectCrewList.map(c => ({
        id: c.id, role: c.role, crew_member_name: c.crew_member_name,
        billable_cost: parseFloat(c.billable_cost) || 0,
        rate_type: c.rate_type, daily_rate: c.daily_rate, total_hours: c.total_hours,
      })),
      subtotal, discount_pct: discountPct, discount_amount: discountAmount,
      tax_pct: taxPct, tax_amount: taxAmount, total,
    };
    await saveMutation.mutateAsync({
      show_id: showId, show_name: show?.name || '', client: show?.client || '',
      line_items: items, status: 'confirmed', is_locked: true,
      confirmed_at: now, confirmed_by: user?.email || '',
      locked_snapshot: snapshotObj,
      discount_pct: discountPct, discount_amount: discountAmount,
      tax_pct: taxPct, tax_amount: taxAmount, subtotal, total, notes, show_daily_breakdown: showDailyBreakdown,
      template_id: selectedTemplateId || null,
    });
    // Sync show: status, fulfillment_status, and quote flags
    await base44.entities.Show.update(showId, {
      status: 'confirmed',
      fulfillment_status: 'picking',
      quote_confirmed: true,
      quote_locked: true,
    });
    queryClient.invalidateQueries({ queryKey: ['shows'] });
    setQuoteStatus('confirmed');
    setConfirmModalOpen(false);
  };

  const handleRevertToPlanning = async () => {
    const now = new Date().toISOString();
    await base44.entities.Quote.update(existingQuote.id, {
      is_locked: false,
      status: 'draft',
      reverted_at: now,
      reverted_by: user?.email || '',
    });
    // Sync show back to planning + clear quote flags
    await base44.entities.Show.update(showId, {
      status: 'planning',
      fulfillment_status: 'planned',
      quote_confirmed: false,
      quote_locked: false,
    });
    queryClient.invalidateQueries({ queryKey: ['quotes'] });
    queryClient.invalidateQueries({ queryKey: ['shows'] });
    setQuoteStatus('draft');
    setRevertModalOpen(false);
  };

  const updateItem = (id, patch) => setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));

  const removeItem = (id) => {
    // Since items are sourced from live ShowRequirements, we hide them on the quote
    // rather than permanently deleting. The item will reappear if unhidden.
    // To truly remove a line, delete the ShowRequirement from the project plan.
    updateItem(id, { is_hidden: true });
  };

  const openAddItem = (roomId) => {
    setAddItemRoomId(roomId);
    setNewItem({ name: '', days: 1, daily_rate: 0, quantity: 1 });
    setAddItemOpen(true);
  };

  const addCustomItem = (e) => {
    e.preventDefault();
    setItems(prev => [...prev, { id: nanoid(), ...newItem, discount_pct: 0, is_hidden: false, room_id: addItemRoomId }]);
    setAddItemOpen(false);
  };

  const statusColors = {
    draft: 'bg-muted text-muted-foreground border',
    sent: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    declined: 'bg-red-500/10 text-red-600 border-red-500/20',
    confirmed: 'bg-emerald-600/15 text-emerald-500 border-emerald-500/30',
    expired: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  };

  if (!show) return <div className="text-center py-20 text-muted-foreground">Loading...</div>;

  return (
    <div className={showPreview ? 'max-w-full' : 'max-w-5xl mx-auto'}>

      {/* Locked Banner */}
      {isLocked && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600">
          <Lock className="w-4 h-4 shrink-0" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-sm font-semibold">Pricing Locked — Quote &amp; Project Confirmed</span>
            {existingQuote?.confirmed_by && (
              <span className="text-xs opacity-70">
                · by {existingQuote.confirmed_by}{existingQuote.confirmed_at && !isNaN(new Date(existingQuote.confirmed_at)) ? ` on ${new Date(existingQuote.confirmed_at).toLocaleDateString()}` : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quote — {show.name}</h1>
          {show.client && <p className="text-muted-foreground text-sm mt-0.5">{show.client}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn('text-sm font-semibold px-3 py-1', statusColors[quoteStatus] || statusColors.draft)}>
            {isLocked && <Lock className="w-3 h-3 mr-1 inline" />}{quoteStatus}
          </Badge>
          <Button variant="outline" size="sm" disabled={isPrinting} onClick={() => {
            if (!selectedTemplateId && printTemplates.length > 0) {
              alert('Please select a template before downloading the PDF.');
              return;
            }
            printQuote({
              quote: {
                ...existingQuote,
                line_items: items,
                discount_pct: discountPct,
                discount_amount: discountAmount,
                tax_pct: taxPct,
                tax_amount: taxAmount,
                subtotal,
                total,
                notes,
                status: quoteStatus,
                template_id: selectedTemplateId,
              },
              show,
              brand,
              projectCrewList,
              templates: printTemplates,
              onStart: () => setIsPrinting(true),
              onDone: () => setIsPrinting(false),
              onError: () => setIsPrinting(false),
            });
          }}>
            {isPrinting ? <><div className="w-3.5 h-3.5 mr-1.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Generating...</> : <><Download className="w-3.5 h-3.5 mr-1.5" />Download PDF</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPreview(p => !p)}>
            {showPreview ? <PanelRightClose className="w-3.5 h-3.5 mr-1.5" /> : <PanelRightOpen className="w-3.5 h-3.5 mr-1.5" />}
            {showPreview ? 'Hide Preview' : 'Live Preview'}
          </Button>
          {!isLocked && (
            <Button size="sm" variant="outline" onClick={() => handleSave('sent')} disabled={saveMutation.isPending}>
              <Send className="w-3.5 h-3.5 mr-1.5" /> Send Quote
            </Button>
          )}
          {isLocked ? (
            <Button size="sm" variant="outline" className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10" onClick={() => setRevertModalOpen(true)}>
              <LockOpen className="w-3.5 h-3.5 mr-1.5" /> Revert to Planning
            </Button>
          ) : (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={async () => {
              // Auto-save first if quote hasn't been saved yet, then open confirm modal
              if (!existingQuote) await saveMutation.mutateAsync({
                show_id: showId, show_name: show?.name || '', client: show?.client || '',
                line_items: items, status: quoteStatus, discount_pct: discountPct, discount_amount: discountAmount,
                tax_pct: taxPct, tax_amount: taxAmount, subtotal, total, notes, show_daily_breakdown: showDailyBreakdown,
                template_id: selectedTemplateId || null,
              });
              setConfirmModalOpen(true);
            }} disabled={saveMutation.isPending}>
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Confirm Quote
            </Button>
          )}
        </div>
      </div>

      <div className={cn('grid gap-6', showPreview ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 lg:grid-cols-3')}>
        {/* Left: Editor */}
        <div className={cn('space-y-4', showPreview ? 'xl:col-span-1' : 'lg:col-span-2')}>

          {/* Options */}
          <Card className="p-3 border-2">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={showDailyBreakdown} onCheckedChange={setShowDailyBreakdown} />
                <span className="font-medium">Show daily rate breakdown</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={includeSubrents} onCheckedChange={setIncludeSubrents} />
                <span className="font-medium flex items-center gap-1.5">
                  <Handshake className="w-3.5 h-3.5 text-amber-500" />
                  Include sub-rentals
                  {subrents.length > 0 && (
                    <Badge className="text-xs bg-amber-500/15 text-amber-500 border-amber-500/30 px-1.5 py-0">{subrents.length}</Badge>
                  )}
                </span>
              </label>
              <div className="flex items-center gap-2 ml-auto">
                <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground font-medium text-xs">Template:</span>
                {printTemplates.length === 0 ? (
                  <Link to="/quote-template-builder" className="text-xs text-primary hover:underline">Create a template →</Link>
                ) : (
                  <Select value={selectedTemplateId || ''} onValueChange={v => { setSelectedTemplateId(v); }}>
                    <SelectTrigger className="h-7 text-xs w-44">
                      <SelectValue placeholder="Select template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {printTemplates.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}{t.is_default ? ' ★' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </Card>

          {/* Room-based sections — only render rooms with content */}
          {activeRooms.length === 0 && (
            <Card className="border-2 border-dashed">
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <Package className="w-8 h-8 text-muted-foreground/40" />
                <div>
                  <p className="font-semibold text-muted-foreground">No items planned</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Add requirements to the project plan — they will appear here automatically.
                  </p>
                </div>

              </div>
            </Card>
          )}
          {activeRooms.map(room => {
            const rItems = itemsByRoom[room.id] || [];
            const rCrew = crewByRoom[room.id] || [];
            const rSubrents = includeSubrents
              ? subrentLineItems.filter(s => (s.room_id || '__unassigned__') === room.id)
              : [];

            // For the __unassigned__ room, only show it if there are equipment/subrent items
            // Crew will be shown in their own dedicated section below
            const visibleItems = rItems.filter(i => !i.is_hidden);
            const hasEquipOrSubrents = visibleItems.length > 0 || rSubrents.length > 0;
            if (!hasEquipOrSubrents && rCrew.length > 0 && room.id === '__unassigned__') return null;

            const roomTotal = visibleItems.reduce((s, i) => s + calcLineTotal(i), 0)
              + rSubrents.reduce((s, sr) => s + (parseFloat(sr.override_price) || 0), 0);
            const isCollapsed = collapsedRooms[room.id];

            return (
              <Card key={room.id} className="border-2 overflow-hidden">
                {/* Room header */}
                <div
                  className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white cursor-pointer select-none"
                  onClick={() => setCollapsedRooms(p => ({ ...p, [room.id]: !p[room.id] }))}
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronRight className="w-4 h-4 opacity-70" /> : <ChevronDown className="w-4 h-4 opacity-70" />}
                    <span className="font-bold">{room.name}</span>
                    <span className="text-xs opacity-60">
                      {visibleItems.length > 0 && `${visibleItems.length} item${visibleItems.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <span className="font-bold">${roomTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                {!isCollapsed && (
                  <CardContent className="p-0">
                    {/* Equipment items */}
                    {rItems.length > 0 && (
                      <>
                        <div className="px-4 py-2 bg-muted/30 border-b flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Equipment</span>
                        </div>
                        {rItems.map(item => (
                          <div key={item.id} className={cn('px-4 py-3 border-b last:border-0', item.is_hidden && 'opacity-40')}>
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{item.name}</p>
                                  {item.is_hidden && <Badge variant="outline" className="text-xs">Hidden</Badge>}
                                </div>
                                {showDailyBreakdown && item.daily_rate > 0 && item.override_price == null && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.days} {item.days === 1 ? 'day' : 'days'} @ ${item.daily_rate}/day
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                                {isLocked ? (
                                  <>
                                    <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                                    <span className="text-xs text-muted-foreground">Days: {item.days}</span>
                                    {item.discount_pct > 0 && <span className="text-xs text-muted-foreground">Disc: {item.discount_pct}%</span>}
                                    <span className="text-sm font-semibold w-20 text-right">${calcLineTotal(item).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    <Lock className="w-3 h-3 text-emerald-500 opacity-60" />
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-muted-foreground">Qty</span>
                                      <Input type="number" value={item.quantity} onChange={e => updateItem(item.id, { quantity: parseFloat(e.target.value) || 1 })} className="w-14 h-7 text-xs text-center" min="1" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-muted-foreground">Days</span>
                                      <Input type="number" value={item.days} onChange={e => updateItem(item.id, { days: parseFloat(e.target.value) || 1 })} className="w-14 h-7 text-xs text-center" min="1" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-muted-foreground">{item.override_price != null ? 'Total' : 'Rate/day'}</span>
                                      <Input type="number" value={item.override_price != null ? item.override_price : item.daily_rate} onChange={e => {
                                        const v = parseFloat(e.target.value) || 0;
                                        // If they edit the rate, update daily_rate and clear any override
                                        updateItem(item.id, { daily_rate: v, override_price: undefined });
                                      }} className="w-20 h-7 text-xs" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Percent className="w-3 h-3 text-muted-foreground" />
                                      <Input type="number" value={item.discount_pct || 0} onChange={e => updateItem(item.id, { discount_pct: parseFloat(e.target.value) || 0 })} className="w-14 h-7 text-xs" min="0" max="100" />
                                    </div>
                                    <span className="text-sm font-semibold w-20 text-right">${calcLineTotal(item).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    <button onClick={() => updateItem(item.id, { is_hidden: !item.is_hidden })} className="text-muted-foreground hover:text-foreground">
                                      {item.is_hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                    <button onClick={() => removeItem(item.id)} className="text-destructive/60 hover:text-destructive">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Sub-rent items */}
                    {rSubrents.length > 0 && (
                      <>
                        <div className="px-4 py-2 bg-amber-500/10 border-b flex items-center gap-1.5">
                          <Handshake className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">Sub-Rentals</span>
                        </div>
                        {rSubrents.map(sr => (
                          <div key={sr.id} className="px-4 py-3 border-b last:border-0 bg-amber-500/5">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{sr.name}</p>
                                <p className="text-xs text-muted-foreground">{sr.partner_name}{sr.quantity > 1 ? ` · ×${sr.quantity}` : ''}</p>
                              </div>
                              <span className="text-sm font-semibold text-amber-500">
                                ${(parseFloat(sr.override_price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </>
                    )}




                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Dedicated Crew & Labor card */}
          {projectCrewList.length > 0 && (
            <Card className="border-2 overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 bg-violet-900 text-white cursor-pointer select-none"
                onClick={() => setCollapsedRooms(p => ({ ...p, __crew__: !p.__crew__ }))}
              >
                <div className="flex items-center gap-2">
                  {collapsedRooms.__crew__ ? <ChevronRight className="w-4 h-4 opacity-70" /> : <ChevronDown className="w-4 h-4 opacity-70" />}
                  <Users className="w-4 h-4 opacity-80" />
                  <span className="font-bold">Crew & Labor</span>
                  <span className="text-xs opacity-60">{projectCrewList.length} {projectCrewList.length === 1 ? 'person' : 'people'}</span>
                </div>
                <span className="font-bold">${projectCrewList.reduce((s, c) => s + (parseFloat(c.billable_cost) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {!collapsedRooms.__crew__ && (
                <CardContent className="p-0">
                  {projectCrewList.map(crew => (
                    <div key={crew.id} className="px-4 py-3 border-b last:border-0 bg-violet-50/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{crew.role}</p>
                          <p className="text-xs text-muted-foreground">{crew.crew_member_name || 'Unassigned'} · {crew.assignment_date || 'No date'}</p>
                        </div>
                        <span className="text-sm font-semibold">${(parseFloat(crew.billable_cost) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )}

          {/* Dedicated Logistics Costs card */}
          {travelLogistics.length > 0 && (
            <Card className="border-2 overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 bg-slate-700 text-white cursor-pointer select-none"
                onClick={() => setCollapsedRooms(p => ({ ...p, __logistics__: !p.__logistics__ }))}
              >
                <div className="flex items-center gap-2">
                  {collapsedRooms.__logistics__ ? <ChevronRight className="w-4 h-4 opacity-70" /> : <ChevronDown className="w-4 h-4 opacity-70" />}
                  <Truck className="w-4 h-4 opacity-80" />
                  <span className="font-bold">Logistics Costs</span>
                  <span className="text-xs opacity-60">{travelLogistics.length} {travelLogistics.length === 1 ? 'item' : 'items'}</span>
                </div>
                <span className="font-bold">${travelLogistics.reduce((s, t) => s + (parseFloat(t.billable_amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {!collapsedRooms.__logistics__ && (
                <CardContent className="p-0">
                  {travelLogistics.map(t => (
                    <div key={t.id} className="px-4 py-3 border-b last:border-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{t.description}</p>
                          <p className="text-xs text-muted-foreground capitalize">{(t.logistics_type || '').replace(/_/g, ' ')}{t.vendor ? ` · ${t.vendor}` : ''}</p>
                        </div>
                        <span className="text-sm font-semibold">${(parseFloat(t.billable_amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )}

        </div>

        {/* Right: Summary sidebar */}
        <div className={cn('space-y-4 self-start', !showPreview && 'sticky top-4')}>
          <Card className="border-2">
            <CardHeader className="pb-3"><CardTitle className="text-base">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm text-muted-foreground flex items-center gap-1"><Percent className="w-3 h-3" /> Discount</label>
                <div className="flex items-center gap-1">
                  {isLocked ? (
                    <span className="text-sm font-medium w-16 text-right">{discountPct}%</span>
                  ) : (
                    <>
                      <Input type="number" value={discountPct} onChange={e => setDiscountPct(parseFloat(e.target.value) || 0)} className="w-16 h-7 text-xs text-right" min="0" max="100" />
                      <span className="text-xs text-muted-foreground">%</span>
                    </>
                  )}
                </div>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Discount</span><span>-${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm text-muted-foreground">Tax</label>
                <div className="flex items-center gap-1">
                  {isLocked ? (
                    <span className="text-sm font-medium w-16 text-right">{taxPct}%</span>
                  ) : (
                    <>
                      <Input type="number" value={taxPct} onChange={e => setTaxPct(parseFloat(e.target.value) || 0)} className="w-16 h-7 text-xs text-right" min="0" />
                      <span className="text-xs text-muted-foreground">%</span>
                    </>
                  )}
                </div>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tax</span><span>+${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-xl">
                <span>Total</span>
                <span>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
            <CardContent>
              <textarea
                value={notes}
                onChange={e => !isLocked && setNotes(e.target.value)}
                readOnly={isLocked}
                placeholder="Quote notes, terms, conditions..."
                className={cn(
                  "w-full h-24 text-sm bg-transparent border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring",
                  isLocked && "opacity-70 cursor-not-allowed"
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-2 bg-violet-50/50 border-violet-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-500" /> Crew Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projectCrewList.length === 0 ? (
                <p className="text-xs text-muted-foreground">No crew assigned. Add crew from the project's Crew tab.</p>
              ) : (
                <div className="space-y-1">
                  {projectCrewList.map(c => (
                    <div key={c.id} className="flex justify-between text-xs py-0.5">
                      <span className="text-muted-foreground">{c.role}{c.crew_member_name ? ` — ${c.crew_member_name}` : ''}</span>
                      <span className="font-medium">${(parseFloat(c.billable_cost) || 0).toFixed(2)}</span>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Crew Total</span>
                    <span>${projectCrewList.reduce((s, c) => s + (parseFloat(c.billable_cost) || 0), 0).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logistics Costs */}
          {travelLogistics.length > 0 && (
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" /> Logistics Costs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {travelLogistics.map(t => (
                    <div key={t.id} className="flex justify-between text-xs py-0.5">
                      <span className="text-muted-foreground truncate pr-2">{t.description}</span>
                      <span className="font-medium shrink-0">${(parseFloat(t.billable_amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Logistics Total</span>
                    <span>${travelLogistics.reduce((s, t) => s + (parseFloat(t.billable_amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Link to={`/invoices/from-quote/${existingQuote?.id || ''}`} className="flex-1">
              <Button variant="outline" className="w-full border-2" disabled={!existingQuote || !['approved', 'confirmed'].includes(quoteStatus)}>
                <FileText className="w-4 h-4 mr-1.5" /> Create Invoice
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Preview Panel */}
        {showPreview && (
          <div className="xl:col-span-2 rounded-xl border-2 overflow-hidden shadow-xl" style={{ minHeight: '700px' }}>
            {previewHTML ? (
              <DocumentPreview
                html={previewHTML}
                title={`Quote — ${show?.name || 'Project'}`}
                onClose={() => setShowPreview(false)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                  Rendering preview...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm Quote Modal */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" /> Confirm Quote?
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2 text-sm">
              <p>This will change both the <strong>quote</strong> and the <strong>project</strong> to <strong>Confirmed</strong> and lock all pricing.</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                <li>Equipment pricing (rates, days, discounts)</li>
                <li>Crew / labor billing rates</li>
                <li>Travel &amp; logistics costs</li>
                <li>Quote totals (subtotal, tax, final total)</li>
              </ul>
              <p className="mt-2 text-muted-foreground flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                Use <strong>Revert to Planning</strong> to undo this and unlock pricing again.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConfirmQuote} disabled={saveMutation.isPending}>
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Confirm Quote &amp; Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert to Planning Modal */}
      <Dialog open={revertModalOpen} onOpenChange={setRevertModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LockOpen className="w-5 h-5 text-amber-500" /> Revert to Planning?
            </DialogTitle>
            <DialogDescription className="text-sm pt-1 space-y-2">
              <p>This will unlock pricing and move both the <strong>quote</strong> and the <strong>project</strong> back to <strong>Planning</strong>.</p>
              <p className="text-muted-foreground">All pricing fields will become editable again. The confirmation snapshot is preserved for reference.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRevertModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRevertToPlanning}>
              <LockOpen className="w-3.5 h-3.5 mr-1.5" /> Revert to Planning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}