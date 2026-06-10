import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';

export default function InventoryWarningsWidget() {
  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets-warnings'],
    queryFn: async () => {
      const all = await base44.entities.Asset.list();
      return all.filter(a => a.condition === 'poor' || a.is_lost || a.status === 'maintenance');
    },
    staleTime: 60000
  });

  if (isLoading) {
    return <Skeleton className="h-24" />;
  }

  const lost = assets?.filter(a => a.is_lost).length || 0;
  const damaged = assets?.filter(a => a.condition === 'poor').length || 0;
  const maintenance = assets?.filter(a => a.status === 'maintenance').length || 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Lost</p>
          <p className="text-lg font-bold text-red-600">{lost}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Damaged</p>
          <p className="text-lg font-bold text-amber-600">{damaged}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Repair</p>
          <p className="text-lg font-bold text-blue-600">{maintenance}</p>
        </div>
      </div>
    </div>
  );
}