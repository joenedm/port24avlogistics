import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, Archive, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  draft:    'bg-slate-500/10 text-slate-400 border-slate-500/20',
  planned:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  loading:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  on_truck: 'bg-primary/10 text-primary border-primary/20',
  on_show:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  returned: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function TruckPackSummary({ showId }) {
  const { data: packs = [], isLoading } = useQuery({
    queryKey: ['truckPacks', showId],
    queryFn: () => base44.entities.TruckPack.filter({ show_id: showId }),
    enabled: !!showId,
  });

  const pack = packs[0];

  // Group pack items by department for the summary
  const deptGroups = {};
  (pack?.pack_items || []).forEach(item => {
    const dept = item.department || 'General';
    if (!deptGroups[dept]) deptGroups[dept] = [];
    deptGroups[dept].push(item);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" /> Truck Pack
          </h3>
          <p className="text-sm text-muted-foreground">
            Build and manage the truck load order for this project.
          </p>
        </div>
        <Link to={`/truck-pack/${showId}`}>
          <Button size="sm" className="gap-2">
            <Truck className="w-4 h-4" />
            {pack ? 'Edit Truck Pack' : 'Build Truck Pack'}
            <ExternalLink className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Loading…</p>
      ) : !pack ? (
        <Card className="p-8 text-center border-dashed">
          <Truck className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-medium mb-1">No truck pack yet</p>
          <p className="text-sm text-muted-foreground mb-4">Use the Truck Pack Builder to plan the load order for this show.</p>
          <Link to={`/truck-pack/${showId}`}>
            <Button><Truck className="w-4 h-4 mr-2" /> Open Truck Pack Builder</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Summary header */}
          <Card className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Vehicle</p>
                  <p className="font-semibold">{pack.vehicle_name || pack.vehicle_type?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Items</p>
                  <p className="font-semibold">{pack.pack_items?.length || 0} containers</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Est. Weight</p>
                  <p className="font-semibold">{(pack.total_weight_lbs || 0).toLocaleString()} lbs</p>
                </div>
              </div>
              <Badge className={cn("text-xs border", STATUS_COLORS[pack.status] || STATUS_COLORS.draft)}>
                {pack.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </div>
          </Card>

          {/* Department groups */}
          {Object.keys(deptGroups).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(deptGroups).map(([dept, items]) => (
                <Card key={dept} className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{dept}</p>
                  <div className="space-y-1.5">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <Archive className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{item.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">#{item.load_order}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                    {items.length} container{items.length !== 1 ? 's' : ''} · {items.reduce((s, i) => s + (i.weight_lbs || 0), 0)} lbs
                  </p>
                </Card>
              ))}
            </div>
          )}

          {pack.warnings?.length > 0 && (
            <Card className="p-3 border-amber-500/30 bg-amber-500/5">
              {pack.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-400">{w}</p>
              ))}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}