import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';

export default function RecentActivityWidget() {
  const { data: movements, isLoading } = useQuery({
    queryKey: ['asset-movements'],
    queryFn: async () => {
      const all = await base44.entities.AssetMovement.list('-created_date', 10);
      return all;
    },
    staleTime: 60000
  });

  if (isLoading) {
    return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>;
  }

  return (
    <div className="space-y-2">
      {movements && movements.length > 0 ? (
        movements.slice(0, 8).map(m => (
          <div key={m.id} className="p-2 text-sm border-b border-border last:border-0 last:pb-0">
            <p className="text-xs text-muted-foreground">{m.action || 'Movement'}</p>
            <p className="text-xs">{new Date(m.created_date).toLocaleString()}</p>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
      )}
    </div>
  );
}