import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { MapPin, Calendar } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';

export default function UpcomingShows({ shows }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Upcoming Shows</CardTitle>
          <Link to="/shows" className="text-xs text-primary hover:underline">View all</Link>
        </div>
      </CardHeader>
      <CardContent>
        {shows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No upcoming shows</p>
        ) : (
          <div className="space-y-3">
            {shows.slice(0, 5).map((show) => (
              <Link
                key={show.id}
                to={`/shows/${show.id}`}
                className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{show.name}</p>
                    {show.venue && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{show.venue}</span>
                      </div>
                    )}
                    {show.start_date && !isNaN(new Date(show.start_date)) && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(show.start_date), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>
                  <StatusBadge status={show.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}