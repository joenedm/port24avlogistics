import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, MapPin, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import VenueFormDialog from '@/components/crm/VenueFormDialog';

const TYPE_LABELS = {
  hotel: 'Hotel', convention_center: 'Convention Center', theater: 'Theater',
  outdoor: 'Outdoor', corporate_office: 'Corporate', arena: 'Arena',
  stadium: 'Stadium', restaurant: 'Restaurant', club: 'Club', other: 'Other',
};

export default function Venues() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ['venues'],
    queryFn: () => db.entities.Venue.list('-created_date'),
  });

  const filtered = venues.filter(v =>
    !search ||
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.city?.toLowerCase().includes(search.toLowerCase()) ||
    v.state?.toLowerCase().includes(search.toLowerCase())
  ).filter(v => v.is_active !== false);

  return (
    <div>
      <PageHeader
        title="Venues"
        description="Venue database with load-in rules and logistics"
        actions={
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Venue
          </Button>
        }
      />

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search venues..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Card key={i}><CardContent className="h-28 animate-pulse bg-muted rounded" /></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No venues found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(venue => (
            <Link key={venue.id} to={`/venues/${venue.id}`}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-sm">{venue.name}</p>
                      {(venue.city || venue.state) && (
                        <p className="text-xs text-muted-foreground mt-0.5">{[venue.city, venue.state].filter(Boolean).join(', ')}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{TYPE_LABELS[venue.venue_type] || 'Venue'}</Badge>
                  </div>
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {venue.union_required && <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">Union</Badge>}
                    {venue.house_engineer_required && <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">House Eng.</Badge>}
                    {venue.load_in_rules && <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20"><AlertTriangle className="w-2.5 h-2.5 mr-1" />Load-in Rules</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <VenueFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={() => queryClient.invalidateQueries({ queryKey: ['venues'] })} />
    </div>
  );
}