import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Skeleton } from '@/components/ui/skeleton';

export default function LowStockWidget() {
  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets-low-stock'],
    queryFn: async () => {
      const all = await db.entities.Asset.list();
      return all.filter(a => a.reorder_level && a.quantity <= a.reorder_level);
    },
    staleTime: 60000
  });

  if (isLoading) {
    return <Skeleton className="h-24" />;
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-2xl font-bold text-amber-600">{assets?.length || 0}</p>
        <p className="text-xs text-muted-foreground">items below reorder level</p>
      </div>
      {assets && assets.length > 0 && (
        <div className="space-y-1">
          {assets.slice(0, 3).map(a => (
            <div key={a.id} className="text-xs">
              <p className="font-medium truncate">{a.name}</p>
              <p className="text-muted-foreground">{a.quantity} in stock</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}