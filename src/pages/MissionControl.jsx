import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { usePermissions } from '@/lib/usePermissions';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Package,
  CalendarDays, BarChart3, AlertTriangle, Zap, Target, Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt$ = (n) => `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

export default function MissionControl() {
  const { canAccessMissionControl } = usePermissions();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('revenue');
  const [profitFilter, setProfitFilter] = useState('all');

  const { data: shows = [] } = useQuery({ queryKey: ['shows'], queryFn: () => db.entities.Show.list() });
  const { data: assets = [] } = useQuery({ queryKey: ['assets'], queryFn: () => db.entities.Asset.list() });
  const { data: movements = [] } = useQuery({ queryKey: ['movements'], queryFn: () => db.entities.AssetMovement.list('-created_date', 2000) });
  const { data: projectCrew = [] } = useQuery({ queryKey: ['allProjectCrew'], queryFn: () => db.entities.ProjectCrew.list() });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => db.entities.Invoice.list() });
  const { data: quotes = [] } = useQuery({ queryKey: ['quotes'], queryFn: () => db.entities.Quote.list() });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => db.entities.Category.list() });
  const { data: crewMembers = [] } = useQuery({ queryKey: ['crewMembers'], queryFn: () => db.entities.CrewMember.list() });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => db.entities.User.list() });

  if (!canAccessMissionControl) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <AlertTriangle className="w-10 h-10 opacity-30" />
        <p className="font-medium">Mission Control is restricted to Admin and Director roles.</p>
      </div>
    );
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];

  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const revenueMonth = paidInvoices.filter(i => (i.updated_date || i.created_date || '') >= monthStart).reduce((s, i) => s + (i.total || 0), 0);
  const revenueYear = paidInvoices.filter(i => (i.updated_date || i.created_date || '') >= yearStart).reduce((s, i) => s + (i.total || 0), 0);
  const totalInvoiceRevenue = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);

  const activeShows = shows.filter(s => !['finished','completed','returned'].includes(s.status));
  const completedShows = shows.filter(s => ['finished','completed'].includes(s.status));

  const assetsOut = assets.filter(a => a.status === 'checked_out').length;
  const equipUtilPct = pct(assetsOut, assets.length);

  // crew utilization: crew members who have at least one assignment vs total
  const uniqueCrewBooked = new Set(projectCrew.map(pc => pc.crew_member_id).filter(Boolean)).size;
  const totalCrewMembers = crewMembers.length || 1;
  const crewUtilPct = pct(uniqueCrewBooked, totalCrewMembers);

  const totalCrewCost = projectCrew.reduce((s, c) => s + (parseFloat(c.internal_cost) || 0), 0);
  const totalCrewBillable = projectCrew.reduce((s, c) => s + (parseFloat(c.billable_cost) || 0), 0);
  const crewMargin = totalCrewBillable - totalCrewCost;

  // ── Equipment utilization ─────────────────────────────────────────────────
  const checkoutMoves = movements.filter(m => m.action === 'check_out');
  const checkoutMovesPerAsset = {};
  checkoutMoves.forEach(m => {
    checkoutMovesPerAsset[m.asset_id] = (checkoutMovesPerAsset[m.asset_id] || 0) + 1;
  });

  const assetStats = assets.map(a => {
    const timesRented = checkoutMovesPerAsset[a.id] || 0;
    const estimatedRevenue = timesRented * (a.daily_rate || 0);
    const purchasePrice = a.purchase_price || 0;
    const profitStatus = purchasePrice === 0 ? 'unknown'
      : estimatedRevenue > purchasePrice ? 'profitable'
      : estimatedRevenue >= purchasePrice * 0.8 ? 'breaking_even'
      : 'losing';
    let flag = null;
    if (timesRented === 0 && (a.daily_rate || 0) > 0) flag = 'underperforming';
    else if (estimatedRevenue > 500) flag = 'strong';
    else if (timesRented > 5) flag = 'high_demand';
    return { ...a, timesRented, estimatedRevenue, profitStatus, flag, isCheckedOut: a.status === 'checked_out' };
  });

  const filteredAssets = assetStats.filter(a => {
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    if (profitFilter !== 'all' && a.profitStatus !== profitFilter) return false;
    return true;
  });
  const sortedAssets = [...filteredAssets].sort((a, b) => {
    if (sortBy === 'revenue') return b.estimatedRevenue - a.estimatedRevenue;
    if (sortBy === 'times_rented') return b.timesRented - a.timesRented;
    return a.name.localeCompare(b.name);
  });

  const totalAssetRevenue = assetStats.reduce((s, a) => s + a.estimatedRevenue, 0);
  const avgDailyRate = assets.filter(a => a.daily_rate > 0).reduce((s, a, _, arr) => s + a.daily_rate / arr.length, 0);
  const underperformers = assetStats.filter(a => a.flag === 'underperforming');
  const neverUsed = assetStats.filter(a => a.timesRented === 0);

  const flagConfig = {
    strong: { label: 'Strong Revenue', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    high_demand: { label: 'High Demand', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    underperforming: { label: 'Underperforming', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  };

  // ── Crew utilization ──────────────────────────────────────────────────────
  const crewBookingCounts = {};
  const crewHours = {};
  projectCrew.forEach(pc => {
    if (!pc.crew_member_id) return;
    crewBookingCounts[pc.crew_member_id] = (crewBookingCounts[pc.crew_member_id] || 0) + 1;
    crewHours[pc.crew_member_id] = (crewHours[pc.crew_member_id] || 0) + (pc.hours || 0);
  });

  const crewStats = crewMembers.map(cm => {
    const userRecord = users.find(u => u.id === cm.user_id);
    const name = userRecord?.full_name || userRecord?.email || cm.email || 'Unknown';
    const bookings = crewBookingCounts[cm.id] || 0;
    const hours = crewHours[cm.id] || 0;
    return { ...cm, name, bookings, hours };
  }).sort((a, b) => b.bookings - a.bookings);

  const maxBookings = crewStats[0]?.bookings || 1;

  // ── Project performance ───────────────────────────────────────────────────
  const showRevenue = shows.map(s => {
    const showInvoices = paidInvoices.filter(i => i.show_id === s.id);
    const revenue = showInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
    const showQuotes = quotes.filter(q => q.show_id === s.id && q.status === 'approved');
    const quoted = showQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
    const crewCost = projectCrew.filter(pc => pc.show_id === s.id).reduce((sum, pc) => sum + (parseFloat(pc.internal_cost) || 0), 0);
    const profit = revenue - crewCost;
    return { ...s, revenue, quoted, crewCost, profit };
  }).sort((a, b) => b.revenue - a.revenue);

  // ── Client insights ───────────────────────────────────────────────────────
  const clientMap = {};
  paidInvoices.forEach(inv => {
    const client = inv.client || shows.find(s => s.id === inv.show_id)?.client || 'Unknown';
    if (!clientMap[client]) clientMap[client] = { name: client, jobs: 0, revenue: 0 };
    clientMap[client].jobs += 1;
    clientMap[client].revenue += inv.total || 0;
  });
  const clients = Object.values(clientMap).sort((a, b) => b.revenue - a.revenue);

  // ── Alerts / Opportunities ────────────────────────────────────────────────
  const STALE_DAYS = 90;
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - STALE_DAYS);
  const staleDateStr = staleDate.toISOString().split('T')[0];

  const staleAssets = assets.filter(a => {
    const lastMove = movements.filter(m => m.asset_id === a.id).sort((a, b) => b.created_date?.localeCompare(a.created_date)).find(() => true);
    return !lastMove || (lastMove.created_date || '') < staleDateStr;
  });

  const lowUtilAssets = assetStats.filter(a => a.timesRented < 2 && (a.daily_rate || 0) > 0);
  const lowBookingCrew = crewStats.filter(c => c.bookings < 2);
  const highCostLowReturn = assetStats.filter(a => (a.purchase_price || 0) > 1000 && a.estimatedRevenue < (a.purchase_price || 0) * 0.3);

  const totalAlerts = staleAssets.length + lowUtilAssets.length + lowBookingCrew.length + highCostLowReturn.length;

  return (
    <div>
      <PageHeader title="Mission Control" description="Business performance, utilization, and insights" />

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Revenue (This Month)', value: fmt$(revenueMonth), icon: DollarSign, color: 'text-emerald-500', sub: `${fmt$(revenueYear)} YTD` },
          { label: 'Active Projects', value: activeShows.length, icon: CalendarDays, color: 'text-primary', sub: `${completedShows.length} completed` },
          { label: 'Equipment Utilization', value: `${equipUtilPct}%`, icon: Package, color: 'text-amber-500', sub: `${assetsOut} of ${assets.length} out`, progress: equipUtilPct },
          { label: 'Crew Utilization', value: `${crewUtilPct}%`, icon: Users, color: 'text-blue-500', sub: `${uniqueCrewBooked} of ${totalCrewMembers} booked`, progress: crewUtilPct },
          { label: 'Total Invoice Revenue', value: fmt$(totalInvoiceRevenue), icon: DollarSign, color: 'text-emerald-600', sub: 'paid invoices all time' },
          { label: 'Est. Equipment Revenue', value: fmt$(totalAssetRevenue), icon: BarChart3, color: 'text-primary', sub: 'based on rates × rentals' },
          { label: 'Crew Margin', value: fmt$(crewMargin), icon: TrendingUp, color: crewMargin >= 0 ? 'text-emerald-500' : 'text-red-500', sub: `${fmt$(totalCrewCost)} cost · ${fmt$(totalCrewBillable)} billable` },
          { label: 'Alerts / Opportunities', value: totalAlerts, icon: AlertTriangle, color: 'text-red-500', sub: 'items needing attention' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider leading-tight">{s.label}</p>
              <s.icon className={`w-4 h-4 shrink-0 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            {s.progress !== undefined && <Progress value={s.progress} className="h-1.5 mt-2 mb-1" />}
            {s.sub && <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>}
          </Card>
        ))}
      </div>

      {/* ── Tabbed sections ── */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="utilization" className="gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Utilization</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Alerts
            {totalAlerts > 0 && <Badge className="h-4 px-1 text-xs bg-red-500/10 text-red-600 border-red-500/20 ml-1">{totalAlerts}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5"><Target className="w-3.5 h-3.5" /> Projects</TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Clients</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Active Projects</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {activeShows.length === 0 && <p className="text-sm text-muted-foreground">No active projects</p>}
                {activeShows.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.client}{s.venue ? ` · ${s.venue}` : ''}</p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Top Performing Assets</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {assetStats.slice(0, 8).sort((a, b) => b.estimatedRevenue - a.estimatedRevenue).map((a, i) => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                      <div>
                        <p className="font-medium text-sm">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.timesRented}× rented</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">{fmt$(a.estimatedRevenue)}</span>
                  </div>
                ))}
                {assetStats.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Recent Invoices</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {invoices.slice(0, 8).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{inv.show_name || 'Invoice'}</p>
                      <p className="text-xs text-muted-foreground capitalize">{inv.status}</p>
                    </div>
                    <span className="text-sm font-semibold">{fmt$(inv.total)}</span>
                  </div>
                ))}
                {invoices.length === 0 && <p className="text-sm text-muted-foreground">No invoices yet</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Top Crew Members</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {crewStats.slice(0, 8).map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.bookings} bookings · {c.hours}h</p>
                      </div>
                    </div>
                    <Progress value={pct(c.bookings, maxBookings)} className="w-16 h-1.5" />
                  </div>
                ))}
                {crewStats.length === 0 && <p className="text-sm text-muted-foreground">No crew data yet</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── UTILIZATION ── */}
        <TabsContent value="utilization" className="space-y-6">
          {/* Equipment */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Equipment Utilization</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Est. Revenue</p>
                <p className="text-2xl font-bold">{fmt$(totalAssetRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">all time</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Utilization</p>
                <p className="text-2xl font-bold">{equipUtilPct}%</p>
                <Progress value={equipUtilPct} className="h-1.5 mt-2" />
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg Daily Rate</p>
                <p className="text-2xl font-bold">${avgDailyRate.toFixed(0)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Never Used</p>
                <p className="text-2xl font-bold text-red-600">{neverUsed.length}</p>
                <p className="text-xs text-muted-foreground mt-1">0 rentals on record</p>
              </Card>
            </div>

            <div className="flex gap-2 mb-3 flex-wrap">
              {[
                { key: 'all', label: 'All Assets' },
                { key: 'profitable', label: 'Profitable' },
                { key: 'breaking_even', label: 'Breaking Even' },
                { key: 'losing', label: 'Losing' },
              ].map(b => (
                <Button key={b.key} size="sm" variant={profitFilter === b.key ? 'default' : 'outline'}
                  onClick={() => setProfitFilter(b.key)}>{b.label}</Button>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-base">Item Performance</CardTitle>
                  <div className="flex gap-2">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">By Revenue</SelectItem>
                        <SelectItem value="times_rented">By Times Rented</SelectItem>
                        <SelectItem value="name">By Name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Item</TableHead>
                        <TableHead className="hidden md:table-cell">Category</TableHead>
                        <TableHead>Rate/Day</TableHead>
                        <TableHead>Rentals</TableHead>
                        <TableHead>Est. Revenue</TableHead>
                        <TableHead className="hidden lg:table-cell">Status</TableHead>
                        <TableHead>Flag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAssets.length === 0
                        ? <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No assets found</TableCell></TableRow>
                        : sortedAssets.map(a => (
                          <TableRow key={a.id} className={cn(a.flag === 'underperforming' && 'bg-red-500/[0.03]')}>
                            <TableCell className="font-medium">{a.name}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{a.category || '—'}</TableCell>
                            <TableCell className="font-mono text-sm">{a.daily_rate ? `$${a.daily_rate}` : '—'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span>{a.timesRented}</span>
                                {a.timesRented > 5 && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">{a.estimatedRevenue > 0 ? fmt$(a.estimatedRevenue) : '—'}</TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className={cn("w-2 h-2 rounded-full inline-block mr-1", a.isCheckedOut ? 'bg-amber-500' : 'bg-emerald-500')} />
                              <span className="text-xs">{a.isCheckedOut ? 'Out' : 'In'}</span>
                            </TableCell>
                            <TableCell>
                              {a.flag && <Badge variant="outline" className={cn('text-xs', flagConfig[a.flag]?.color)}>{flagConfig[a.flag]?.label}</Badge>}
                            </TableCell>
                          </TableRow>
                        ))
                      }
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Crew */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Crew Utilization</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Crew Utilized</p>
                <p className="text-2xl font-bold">{crewUtilPct}%</p>
                <Progress value={crewUtilPct} className="h-1.5 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{uniqueCrewBooked} of {totalCrewMembers} booked</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Crew Billable</p>
                <p className="text-2xl font-bold">{fmt$(totalCrewBillable)}</p>
                <p className="text-xs text-muted-foreground mt-1">{fmt$(totalCrewCost)} internal cost</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Low Bookings</p>
                <p className="text-2xl font-bold text-amber-600">{lowBookingCrew.length}</p>
                <p className="text-xs text-muted-foreground mt-1">crew with &lt;2 assignments</p>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Crew Booking Frequency</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Crew Member</TableHead>
                      <TableHead>Bookings</TableHead>
                      <TableHead>Hours Logged</TableHead>
                      <TableHead>Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crewStats.length === 0
                      ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No crew data</TableCell></TableRow>
                      : crewStats.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.bookings}</TableCell>
                          <TableCell>{c.hours > 0 ? `${c.hours}h` : '—'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={pct(c.bookings, maxBookings)} className="w-20 h-1.5" />
                              {c.bookings === 0 && <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">Not Used</Badge>}
                              {c.bookings >= 5 && <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    }
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── ALERTS ── */}
        <TabsContent value="alerts" className="space-y-4">
          <p className="text-sm text-muted-foreground mb-2">Items and crew members that may need attention.</p>

          {totalAlerts === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No alerts right now — everything looks healthy!</p>
            </Card>
          )}

          {staleAssets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Not Used in {STALE_DAYS}+ Days ({staleAssets.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {staleAssets.slice(0, 15).map(a => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.category || 'Uncategorized'}</p>
                    </div>
                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">Not Used Recently</Badge>
                  </div>
                ))}
                {staleAssets.length > 15 && <p className="text-xs text-muted-foreground pt-1">+{staleAssets.length - 15} more</p>}
              </CardContent>
            </Card>
          )}

          {lowUtilAssets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  Low Utilization Equipment ({lowUtilAssets.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {lowUtilAssets.slice(0, 15).map(a => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.timesRented} rental(s) · {a.daily_rate ? `$${a.daily_rate}/day` : 'no rate'}</p>
                    </div>
                    <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">Low Utilization</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {highCostLowReturn.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-red-500" />
                  High Cost / Low Return ({highCostLowReturn.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {highCostLowReturn.slice(0, 15).map(a => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">Cost {fmt$(a.purchase_price)} · Revenue {fmt$(a.estimatedRevenue)}</p>
                    </div>
                    <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">High Cost / Low Return</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {lowBookingCrew.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  Low Booking Crew ({lowBookingCrew.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {lowBookingCrew.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <p className="text-sm font-medium">{c.name}</p>
                    <Badge variant="outline" className={cn('text-xs', c.bookings === 0 ? 'bg-red-500/10 text-red-600 border-red-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20')}>
                      {c.bookings === 0 ? 'Never Booked' : `${c.bookings} booking${c.bookings > 1 ? 's' : ''}`}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── PROJECTS ── */}
        <TabsContent value="projects">
          <Card>
            <CardHeader><CardTitle className="text-base">Project Performance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Show</TableHead>
                    <TableHead className="hidden md:table-cell">Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invoice Revenue</TableHead>
                    <TableHead className="hidden lg:table-cell">Crew Cost</TableHead>
                    <TableHead>Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showRevenue.length === 0
                    ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No project data</TableCell></TableRow>
                    : showRevenue.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{s.client || '—'}</TableCell>
                        <TableCell><StatusBadge status={s.status} /></TableCell>
                        <TableCell className="font-semibold text-emerald-600">{s.revenue > 0 ? fmt$(s.revenue) : '—'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{s.crewCost > 0 ? fmt$(s.crewCost) : '—'}</TableCell>
                        <TableCell>
                          {s.revenue > 0 ? (
                            <span className={cn('font-semibold text-sm', s.profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                              {fmt$(s.profit)}
                            </span>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CLIENTS ── */}
        <TabsContent value="clients">
          <Card>
            <CardHeader><CardTitle className="text-base">Client Insights</CardTitle></CardHeader>
            <CardContent>
              {clients.length === 0
                ? <p className="text-sm text-muted-foreground py-8 text-center">No client data from paid invoices yet</p>
                : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>#</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Jobs</TableHead>
                        <TableHead>Total Revenue</TableHead>
                        <TableHead>Avg Job Size</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((c, i) => (
                        <TableRow key={c.name}>
                          <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.jobs}</TableCell>
                          <TableCell className="font-semibold text-emerald-600">{fmt$(c.revenue)}</TableCell>
                          <TableCell>{fmt$(c.revenue / c.jobs)}</TableCell>
                          <TableCell>
                            {c.jobs >= 3
                              ? <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Repeat</Badge>
                              : <Badge variant="outline" className="text-xs">One-time</Badge>
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              }
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}