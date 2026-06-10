import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

export default function InventoryUtilizationWidget() {
  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets-utilization'],
    queryFn: async () => {
      const all = await db.entities.Asset.list();
      return all;
    },
    staleTime: 60000
  });

  if (isLoading) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-8" />)}</div>;
  }

  if (!assets || assets.length === 0) {
    return <p className="text-sm text-muted-foreground">No inventory data</p>;
  }

  const checkedOut = assets.filter(a => a.status === 'checked_out').length;
  const total = assets.length;
  const pct = Math.round((checkedOut / total) * 100);

  const byCategory = {};
  assets.forEach(a => {
    const cat = a.category || 'Uncategorized';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, out: 0 };
    byCategory[cat].total++;
    if (a.status === 'checked_out') byCategory[cat].out++;
  });

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-muted-foreground">Overall</span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>
      <div className="space-y-3">
        {Object.entries(byCategory).slice(0, 4).map(([cat, { total, out }]) => {
          const catPct = total ? Math.round((out / total) * 100) : 0;
          return (
            <div key={cat}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{cat}</span>
                <span>{out}/{total} ({catPct}%)</span>
              </div>
              <Progress value={catPct} className="h-1.5" />
            </div>
          );
        })}
      </div>
    </div>
  );
}