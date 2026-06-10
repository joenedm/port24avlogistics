import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Package, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PickListSummaryCards({ requirements, fulfillments }) {
  const totalLineItems = requirements.length;
  const totalRequired = requirements.reduce((s, r) => s + (r.quantity_needed || 1), 0);

  let totalScanned = 0;
  let fullyPickedLines = 0;
  let partialLines = 0;

  for (const req of requirements) {
    const count = fulfillments.filter(f => f.requirement_id === req.id && f.movement_state !== 'returned').length;
    const needed = req.quantity_needed || 1;
    const clamped = Math.min(count, needed);
    totalScanned += clamped;
    if (count >= needed) fullyPickedLines++;
    else if (count > 0) partialLines++;
  }

  const totalRemaining = totalRequired - totalScanned;
  const extraScans = fulfillments.filter(f => !f.requirement_id && f.movement_state !== 'returned').length;
  const pct = totalRequired > 0 ? Math.round((totalScanned / totalRequired) * 100) : 0;

  const stats = [
    {
      label: 'Line Items',
      value: totalLineItems,
      sub: `${fullyPickedLines} complete, ${partialLines} partial`,
      icon: Package,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Total Required',
      value: totalRequired,
      sub: 'units across all lines',
      icon: Clock,
      color: 'text-muted-foreground',
      bg: 'bg-muted/30',
    },
    {
      label: 'Scanned',
      value: totalScanned,
      sub: `${pct}% complete`,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Remaining',
      value: totalRemaining,
      sub: totalRemaining === 0 ? 'All picked!' : 'still needed',
      icon: TrendingUp,
      color: totalRemaining === 0 ? 'text-emerald-500' : 'text-amber-500',
      bg: totalRemaining === 0 ? 'bg-emerald-500/10' : 'bg-amber-500/10',
    },
    {
      label: 'Issues',
      value: extraScans,
      sub: extraScans === 0 ? 'No conflicts' : 'unmatched scans',
      icon: AlertTriangle,
      color: extraScans > 0 ? 'text-red-500' : 'text-muted-foreground',
      bg: extraScans > 0 ? 'bg-red-500/10' : 'bg-muted/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.map(s => {
        const Icon = s.icon;
        return (
          <Card key={s.label} className="border-border/60">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                  <p className={cn("text-2xl font-bold mt-0.5", s.color)}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                </div>
                <div className={cn("p-2 rounded-lg", s.bg)}>
                  <Icon className={cn("w-4 h-4", s.color)} />
                </div>
              </div>
              {/* Mini progress for scanned card */}
              {s.label === 'Scanned' && totalRequired > 0 && (
                <div className="mt-2 w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}