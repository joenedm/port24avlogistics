import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

export default function UpcomingShowsWidget() {
  const { data: shows, isLoading } = useQuery({
    queryKey: ['shows-upcoming'],
    queryFn: async () => {
      const all = await db.entities.Show.list('-start_date', 10);
      return all.filter(s => new Date(s.start_date) > new Date());
    },
    staleTime: 60000
  });

  if (isLoading) {
    return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>;
  }

  return (
    <div className="space-y-2">
      {shows && shows.length > 0 ? (
        shows.slice(0, 5).map(show => (
          <Link key={show.id} to={`/shows/${show.id}`}>
            <div className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{show.name}</p>
                  <p className="text-xs text-muted-foreground">{show.client}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">{new Date(show.start_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </Link>
        ))
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No upcoming shows</p>
      )}
    </div>
  );
}