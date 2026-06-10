import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Calendar, MapPin, DollarSign, Phone, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function CrewBookingDetail() {
  const { id } = useParams();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['crewBooking', id],
    queryFn: async () => {
      const bookings = await base44.entities.CrewBooking.list();
      return bookings.find(b => b.id === id);
    },
  });

  const { data: shows } = useQuery({
    queryKey: ['shows'],
    queryFn: () => base44.entities.Show.list(),
    enabled: !!booking?.show_id,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>;
  }

  if (!booking) {
    return <div className="text-center py-12"><p className="text-muted-foreground">Booking not found</p></div>;
  }

  const statusColors = {
    invited: 'bg-blue-500/10 text-blue-700',
    accepted: 'bg-emerald-500/10 text-emerald-700',
    declined: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{booking.show_name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{shows?.find(s => s.id === booking.show_id)?.venue}</p>
            </div>
            <Badge className={statusColors[booking.status]}>{booking.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">DATES</p>
                <p className="text-sm font-semibold">
                  {booking.start_date && !isNaN(new Date(booking.start_date)) ? format(new Date(booking.start_date), 'MMM d, yyyy') : '—'}
                  {' - '}
                  {booking.end_date && !isNaN(new Date(booking.end_date)) ? format(new Date(booking.end_date), 'MMM d, yyyy') : '—'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <DollarSign className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">RATE</p>
                <p className="text-sm font-semibold">${booking.rate}/{booking.rate_type}</p>
              </div>
            </div>
          </div>

          {booking.total_pay && (
            <div className="bg-primary/10 px-4 py-3 rounded-lg border border-primary/20">
              <p className="text-xs text-muted-foreground font-medium mb-1">TOTAL PAY</p>
              <p className="text-2xl font-bold text-primary">${booking.total_pay}</p>
            </div>
          )}

          {booking.accommodation && (
            <div className="flex gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">ACCOMMODATION</p>
                <p className="text-sm font-semibold">{booking.accommodation}</p>
              </div>
            </div>
          )}

          {booking.notes && (
            <div className="flex gap-3">
              <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">NOTES</p>
                <p className="text-sm">{booking.notes}</p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">Invitation sent {booking.sms_sent_at && !isNaN(new Date(booking.sms_sent_at)) ? format(new Date(booking.sms_sent_at), 'MMM d, yyyy @ h:mm a') : '—'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}