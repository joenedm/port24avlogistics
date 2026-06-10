import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, AlertTriangle, Package, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/shared/PageHeader';

export default function Utilization() {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('revenue');
  const [profitFilter, setProfitFilter] = useState('all');

  const { data: assets = [] } = useQuery({ queryKey: ['assets'], queryFn: () => base44.entities.Asset.list() });
  const { data: movements = [] } = useQuery({ queryKey: ['movements'], queryFn: () => base44.entities.AssetMovement.list('-created_date', 2000) });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => base44.entities.Category.list() });

  // Build utilization data per asset
  const assetStats = assets.map(a => {
    const assetMovements = movements.filter(m => m.asset_id === a.id && m.action === 'check_out');
    const timesRented = assetMovements.length;
    const estimatedRevenue = timesRented * (a.daily_rate || 0);
    const isCheckedOut = a.status === 'checked_out';

    let flag = null;
    if (timesRented === 0 && a.daily_rate > 0) flag = 'underperforming';
    else if (estimatedRevenue > 500) flag = 'strong';
    else if (timesRented > 5) flag = 'high_demand';

    return { ...a, timesRented, estimatedRevenue, isCheckedOut, flag };
  });

  // Compute profitability per asset
  const withProfit = assetStats.map(a => {
    const purchasePrice = a.purchase_price || 0;
    if (purchasePrice === 0) return { ...a, profitStatus: 'unknown' };
    if (a.estimatedRevenue > purchasePrice) return { ...a, profitStatus: 'profitable' };
    if (a.estimatedRevenue >= purchasePrice * 0.8) return { ...a, profitStatus: 'breaking_even' };
    return { ...a, profitStatus: 'losing' };
  });

  const filtered = withProfit.filter(a => {
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    if (profitFilter !== 'all' && a.profitStatus !== profitFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'revenue') return b.estimatedRevenue - a.estimatedRevenue;
    if (sortBy === 'times_rented') return b.timesRented - a.timesRented;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  const totalRevenue = assetStats.reduce((s, a) => s + a.estimatedRevenue, 0);
  const avgDailyRate = assets.filter(a => a.daily_rate > 0).reduce((s, a, _, arr) => s + a.daily_rate / arr.length, 0);
  const utilPct = assets.length ? Math.round((assets.filter(a => a.status === 'checked_out').length / assets.length) * 100) : 0;
  const underperformers = assetStats.filter(a => a.flag === 'underperforming').length;

  const flagConfig = {
    strong: { label: 'Strong Revenue', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    high_demand: { label: 'High Demand', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    underperforming: { label: 'Underperforming', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  };

  return (
    <div>
      <PageHeader title="Revenue & Utilization" description="Track performance and identify opportunities" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Est. Revenue</p>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">all time (based on rates)</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Utilization</p>
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold">{utilPct}%</p>
          <Progress value={utilPct} className="h-1.5 mt-2" />
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Daily Rate</p>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold">${avgDailyRate.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-1">across priced items</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Underperforming</p>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{underperformers}</p>
          <p className="text-xs text-muted-foreground mt-1">items never rented</p>
        </Card>
      </div>

      {/* Profit filter quick buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'all', label: 'All Assets' },
          { key: 'profitable', label: '✅ Profitable' },
          { key: 'breaking_even', label: '⚖️ Breaking Even' },
          { key: 'losing', label: '🔴 Losing Money' },
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
                  <TableHead>Daily Rate</TableHead>
                  <TableHead>Times Rented</TableHead>
                  <TableHead>Est. Revenue</TableHead>
                  <TableHead className="hidden lg:table-cell">Status</TableHead>
                  <TableHead>Flag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No assets found</TableCell></TableRow>
                ) : sorted.map(a => (
                  <TableRow key={a.id} className={cn(a.flag === 'underperforming' && 'bg-red-500/3')}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{a.category || '—'}</TableCell>
                    <TableCell className="font-mono text-sm">{a.daily_rate ? `$${a.daily_rate}` : '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{a.timesRented}</span>
                        {a.timesRented > 5 && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{a.estimatedRevenue > 0 ? `$${a.estimatedRevenue.toLocaleString()}` : '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className={cn("w-2 h-2 rounded-full inline-block mr-1", a.isCheckedOut ? 'bg-amber-500' : 'bg-emerald-500')} />
                      <span className="text-xs">{a.isCheckedOut ? 'Out' : 'In'}</span>
                    </TableCell>
                    <TableCell>
                      {a.flag && <Badge variant="outline" className={cn('text-xs', flagConfig[a.flag]?.color)}>{flagConfig[a.flag]?.label}</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}