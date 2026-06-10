import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Calendar, DollarSign, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import { format } from 'date-fns';

export default function CrewDashboard() {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [responding, setResponding] = useState(null);
  const queryClient = useQueryClient();

  const { data: crew = [] } = useQuery({
    queryKey: ['myCrewProfile'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const crewList = await base44.entities.CrewMember.filter({ user_id: user.id });
      return crewList[0] || null;
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['myBookings', crew?.id],
    queryFn: async () => {
      if (!crew?.id) return [];
      return base44.entities.CrewBooking.filter({ crew_id: crew.id }, '-created_date');
    },
    enabled: !!crew?.id,
  });

  const { data: shows = [] } = useQuery({
    queryKey: ['shows'],
    queryFn: () => base44.entities.Show.list(),
  });

  const respondMutation = useMutation({
    mutationFn: (status) => base44.entities.CrewBooking.update(selectedBooking.id, {
      status,
      responded_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      setRespondDialogOpen(false);
      setResponding(null);
    },
  });

  const handleRespond = async (status) => {
    setResponding(status);
    await respondMutation.mutateAsync(status);
  };

  const pending = bookings.filter(b => b.status === 'invited');
  const accepted = bookings.filter(b => b.status === 'accepted');
  const declined = bookings.filter(b => b.status === 'declined');

  const BookingCard = ({ booking, isPending }) => {
    const show = shows.find(s => s.id === booking.show_id);
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base">{booking.show_name}</CardTitle>
              {show?.venue && <CardDescription>{show.venue}</CardDescription>}
            </div>
            <Badge variant={booking.status === 'accepted' ? 'default' : booking.status === 'declined' ? 'outline' : 'secondary'}>
              {booking.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {booking.start_date && !isNaN(new Date(booking.start_date)) && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Dates</p>
                  <p className="font-medium">
                    {format(new Date(booking.start_date), 'MMM d')}
                    {booking.end_date && !isNaN(new Date(booking.end_date)) ? ` - ${format(new Date(booking.end_date), 'MMM d')}` : ''}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Rate</p>
                <p className="font-medium">${booking.rate} {booking.rate_type === 'daily' ? '/day' : '/hr'}</p>
              </div>
            </div>
          </div>

          {booking.total_pay && (
            <div className="bg-primary/10 px-3 py-2 rounded-lg text-sm font-semibold text-primary">
              Total: ${booking.total_pay}
            </div>
          )}

          {booking.notes && (
            <p className="text-sm text-muted-foreground italic">"{booking.notes}"</p>
          )}

          {isPending && (
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => { setSelectedBooking(booking); setRespondDialogOpen(true); setResponding('accept'); }}
                className="flex-1 h-9"
                size="sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Accept
              </Button>
              <Button
                onClick={() => { setSelectedBooking(booking); setRespondDialogOpen(true); setResponding('decline'); }}
                variant="outline"
                className="flex-1 h-9"
                size="sm"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <PageHeader title="My Crew Bookings" description="View and respond to show invitations" />

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" /> Pending Invitations ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map(b => <BookingCard key={b.id} booking={b} isPending />)}
          </div>
        </div>
      )}

      {accepted.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Accepted ({accepted.length})
          </h2>
          <div className="space-y-3">
            {accepted.map(b => <BookingCard key={b.id} booking={b} />)}
          </div>
        </div>
      )}

      {declined.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-muted-foreground" /> Declined ({declined.length})
          </h2>
          <div className="space-y-3">
            {declined.map(b => <BookingCard key={b.id} booking={b} />)}
          </div>
        </div>
      )}

      {bookings.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No bookings yet. Check back soon!</p>
          </CardContent>
        </Card>
      )}

      {/* Respond dialog */}
      <Dialog open={respondDialogOpen} onOpenChange={setRespondDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responding === 'accept' ? 'Accept Booking?' : 'Decline Booking?'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm">{selectedBooking?.show_name}</p>
            <p className="text-sm font-semibold">
              ${selectedBooking?.rate} {selectedBooking?.rate_type === 'daily' ? 'per day' : 'per hour'}
            </p>
            {selectedBooking?.total_pay && (
              <p className="text-sm bg-primary/10 px-3 py-2 rounded text-primary font-bold">
                Total: ${selectedBooking.total_pay}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRespondDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => handleRespond(responding)}
              disabled={respondMutation.isPending}
              className={responding === 'decline' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {respondMutation.isPending ? 'Saving...' : responding === 'accept' ? 'Accept' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}