import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Skeleton } from '@/components/ui/skeleton';

export default function CrewAssignmentsWidget() {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['crew-bookings-active'],
    queryFn: async () => {
      const all = await db.entities.CrewBooking.list();
      return all.filter(b => ['confirmed', 'assigned'].includes(b.status));
    },
    staleTime: 60000
  });

  if (isLoading) {
    return <Skeleton className="h-24" />;
  }

  return (
    <div className="space-y-2">
      <p className="text-2xl font-bold">{bookings?.length || 0}</p>
      <p className="text-xs text-muted-foreground">active assignments</p>
      {bookings && bookings.length > 0 && (
        <div className="mt-3 space-y-1 text-xs">
          {bookings.slice(0, 3).map(b => (
            <p key={b.id} className="text-muted-foreground truncate">{b.crew_role}</p>
          ))}
        </div>
      )}
    </div>
  );
}