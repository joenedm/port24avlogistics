import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine, Wrench, History, ChevronRight, Search, ArrowLeft, User, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import moment from 'moment';
import PageHeader from '@/components/shared/PageHeader';

const actionConfig = {
  check_out: { icon: ArrowUpFromLine, label: 'Check Out', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  check_in: { icon: ArrowDownToLine, label: 'Check In', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  transfer: { icon: ArrowRightLeft, label: 'Transfer', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  maintenance: { icon: Wrench, label: 'Maintenance', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
};

function ShowDetail({ showName, movements, onBack }) {
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => movements.filter(m => {
    const matchAction = actionFilter === 'all' || m.action === actionFilter;
    const s = search.toLowerCase();
    const matchSearch = !s ||
      m.asset_name?.toLowerCase().includes(s) ||
      m.asset_barcode?.toLowerCase().includes(s) ||
      m.scanned_by?.toLowerCase().includes(s) ||
      m.from_location?.toLowerCase().includes(s) ||
      m.to_location?.toLowerCase().includes(s);
    return matchAction && matchSearch;
  }), [movements, actionFilter, search]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div>
          <h2 className="text-xl font-bold">{showName || 'No Show'}</h2>
          <p className="text-sm text-muted-foreground">{movements.length} movements</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search asset, barcode, user, location..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(actionConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-xs text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Time</th>
                <th className="px-4 py-2.5 text-left font-medium">Action</th>
                <th className="px-4 py-2.5 text-left font-medium">Asset</th>
                <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">From</th>
                <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">To</th>
                <th className="px-4 py-2.5 text-left font-medium hidden lg:table-cell">Moved By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No movements found</td></tr>
              ) : filtered.map(m => {
                const config = actionConfig[m.action] || actionConfig.transfer;
                const Icon = config.icon;
                return (
                  <tr key={m.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{moment(m.created_date).format('MMM D, h:mm a')}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn('gap-1 text-xs', config.color)}>
                        <Icon className="w-3 h-3" />{config.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium">{m.asset_name || '—'}</p>
                          {m.asset_barcode && <p className="text-xs text-muted-foreground font-mono">{m.asset_barcode}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{m.from_location || '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{m.to_location || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="w-3 h-3 shrink-0" />
                        {m.scanned_by || m.created_by || <span className="italic opacity-50">Unknown</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function Movements() {
  const [selectedShow, setSelectedShow] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['movements'],
    queryFn: () => base44.entities.AssetMovement.list('-created_date', 5000),
  });

  // Group movements by show
  const showGroups = useMemo(() => {
    const map = {};
    movements.forEach(m => {
      const key = m.show_id || '__no_show';
      const label = m.show_name || 'No Show / Warehouse';
      if (!map[key]) map[key] = { key, label, movements: [], latestDate: null };
      map[key].movements.push(m);
      const d = new Date(m.created_date);
      if (!map[key].latestDate || d > new Date(map[key].latestDate)) {
        map[key].latestDate = m.created_date;
      }
    });
    // Sort by latest activity
    return Object.values(map).sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate));
  }, [movements]);

  const filteredGroups = useMemo(() => {
    return showGroups.filter(g => {
      const s = search.toLowerCase();
      const matchSearch = !s || g.label.toLowerCase().includes(s);
      const matchAction = actionFilter === 'all' || g.movements.some(m => m.action === actionFilter);
      return matchSearch && matchAction;
    });
  }, [showGroups, search, actionFilter]);

  if (selectedShow) {
    const group = showGroups.find(g => g.key === selectedShow);
    return (
      <div>
        <PageHeader title="Movement Log" description="Full history of all asset movements" />
        <ShowDetail
          showName={group?.label}
          movements={group?.movements || []}
          onBack={() => setSelectedShow(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Movement Log" description="Full history of all asset movements" />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Movements</p>
          <p className="text-2xl font-bold">{movements.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Shows</p>
          <p className="text-2xl font-bold">{showGroups.filter(g => g.key !== '__no_show').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Check Outs</p>
          <p className="text-2xl font-bold text-amber-600">{movements.filter(m => m.action === 'check_out').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Check Ins</p>
          <p className="text-2xl font-bold text-emerald-600">{movements.filter(m => m.action === 'check_in').length}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search shows..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(actionConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Show list */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-muted-foreground">No movements recorded yet</p>
          </div>
        ) : (
          <div>
            {filteredGroups.map(group => {
              const actionCounts = {};
              group.movements.forEach(m => { actionCounts[m.action] = (actionCounts[m.action] || 0) + 1; });
              const uniqueUsers = [...new Set(group.movements.map(m => m.scanned_by || m.created_by).filter(Boolean))];
              return (
                <button
                  key={group.key}
                  className="w-full flex items-center gap-4 px-4 py-3.5 border-b border-border/50 hover:bg-muted/30 transition-colors text-left"
                  onClick={() => setSelectedShow(group.key)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold truncate">{group.label}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {Object.entries(actionCounts).map(([action, count]) => {
                        const cfg = actionConfig[action] || actionConfig.transfer;
                        const Icon = cfg.icon;
                        return (
                          <Badge key={action} variant="outline" className={cn('gap-1 text-xs', cfg.color)}>
                            <Icon className="w-3 h-3" />{count}
                          </Badge>
                        );
                      })}
                      {uniqueUsers.length > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {uniqueUsers.slice(0, 2).join(', ')}{uniqueUsers.length > 2 ? ` +${uniqueUsers.length - 2}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{group.movements.length} moves</p>
                    <p className="text-xs text-muted-foreground">{moment(group.latestDate).fromNow()}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}