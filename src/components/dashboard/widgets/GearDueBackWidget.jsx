import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Skeleton } from '@/components/ui/skeleton';

export default function GearDueBackWidget() {
  const { data: fulfillments, isLoading } = useQuery({
    queryKey: ['fulfillments-returning'],
    queryFn: async () => {
      const all = await db.entities.ShowFulfillment.list();
      return all.filter(f => ['returning', 'returned'].includes(f.movement_state));
    },
    staleTime: 60000
  });

  if (isLoading) {
    return <Skeleton className="h-24" />;
  }

  const returning = fulfillments?.filter(f => f.movement_state === 'returning') || [];

  return (
    <div className="space-y-2">
      <p className="text-2xl font-bold">{returning.length}</p>
      <p className="text-xs text-muted-foreground">items being returned</p>
    </div>
  );
}