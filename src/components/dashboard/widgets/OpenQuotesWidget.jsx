import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

export default function OpenQuotesWidget() {
  const { data: quotes, isLoading } = useQuery({
    queryKey: ['quotes-open'],
    queryFn: async () => {
      const all = await db.entities.Quote.list();
      return all.filter(q => ['draft', 'sent'].includes(q.status));
    },
    staleTime: 60000
  });

  if (isLoading) {
    return <Skeleton className="h-24" />;
  }

  const total = quotes?.reduce((sum, q) => sum + (q.total || 0), 0) || 0;

  return (
    <div className="space-y-2">
      <div>
        <p className="text-2xl font-bold">{quotes?.length || 0}</p>
        <p className="text-xs text-muted-foreground">pending approval</p>
      </div>
      <p className="text-sm font-semibold">${(total / 1000).toFixed(1)}k</p>
    </div>
  );
}