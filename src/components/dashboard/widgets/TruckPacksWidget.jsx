import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function TruckPacksWidget() {
  const { data: packs, isLoading } = useQuery({
    queryKey: ['truck-packs-active'],
    queryFn: async () => {
      const all = await db.entities.TruckPack.list();
      return all.filter(p => ['loading', 'on_truck', 'on_show'].includes(p.status));
    },
    staleTime: 60000
  });

  if (isLoading) {
    return <Skeleton className="h-24" />;
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-2xl font-bold">{packs?.length || 0}</p>
        <p className="text-xs text-muted-foreground">active truck packs</p>
      </div>
      {packs && packs.length > 0 && (
        <div className="space-y-1">
          {packs.slice(0, 2).map(p => (
            <div key={p.id} className="text-xs">
              <p className="font-medium truncate">{p.vehicle_name}</p>
              <Badge variant="outline" className="text-xs">{p.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}