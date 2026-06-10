import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectsAttentionWidget() {
  const { data: shows, isLoading } = useQuery({
    queryKey: ['shows-attention'],
    queryFn: async () => {
      const all = await base44.entities.Show.list();
      return all.filter(s => ['picking', 'on_truck', 'needs_return'].includes(s.status));
    },
    staleTime: 60000
  });

  if (isLoading) {
    return <Skeleton className="h-24" />;
  }

  return (
    <div className="space-y-2">
      <p className="text-2xl font-bold">{shows?.length || 0}</p>
      <p className="text-xs text-muted-foreground">projects need attention</p>
      {shows && shows.length > 0 && (
        <div className="mt-3 space-y-1 text-xs">
          {shows.slice(0, 3).map(s => (
            <p key={s.id} className="text-muted-foreground truncate">{s.name}</p>
          ))}
        </div>
      )}
    </div>
  );
}