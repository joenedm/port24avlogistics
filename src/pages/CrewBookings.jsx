import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Mail, Clock, CheckCircle2, XCircle, Send, Calendar, User, Briefcase, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import PageHeader from '@/components/shared/PageHeader';
import CrewInviteWorkflow from '@/components/email/CrewInviteWorkflow';
import { usePermissions } from '@/lib/usePermissions';
import { format } from 'date-fns';
import { formatDateRange } from '@/lib/dateRange';

const STATUS_CONFIG = {
  not_sent:  { label: 'Not Sent',    className: 'bg-slate-500/10 text-slate-400 border-slate-500/20',       icon: Clock },
  pending:   { label: 'Invite Sent', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',          icon: Send },
  confirmed: { label: 'Accepted',    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  declined:  { label: 'Declined',    className: 'bg-red-500/10 text-red-400 border-red-500/20',             icon: XCircle },
  cancelled: { label: 'Cancelled',   className: 'bg-slate-500/10 text-slate-400 border-slate-500/20',       icon: XCircle },
};

export default function CrewBookings() {
  const { canManageCrew } = usePermissions();
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [inviteWorkflowOpen, setInviteWorkflowOpen] = useState(false);
  const [selectedShow, setSelectedShow] = useState('');
  const [selectedCrew, setSelectedCrew] = useState('');
  const [role, setRole] = useState('');
  const [rate, setRate] = useState('');
  const [rateType, setRateType] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [accommodation, setAccommodation] = useState('');
  const [notes, setNotes] = useState('');
  const [pendingBooking, setPendingBooking] = useState(null);
  const [workflowShowData, setWorkflowShowData] = useState(null);
  const [workflowRecipientEmail, setWorkflowRecipientEmail] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: shows = [] } = useQuery({
    queryKey: ['shows'],
    queryFn: () => db.entities.Show.list(),
  });

  const { data: crew = [] } = useQuery({
    queryKey: ['crewMembers'],
    queryFn: () => db.entities.CrewMember.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => db.entities.User.list(),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['crewBookings'],
    queryFn: () => db.entities.CrewBooking.list('-created_date'),
    refetchInterval: 15000,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const show = shows.find(s => s.id === data.show_id);
      const crewMember = crew.find(c => c.id === data.crew_id);
      const user = users.find(u => u.id === crewMember?.user_id);

      const booking = await db.entities.CrewBooking.create({
        ...data,
        show_name: show?.name,
        crew_name: user?.full_name || crewMember?.user_id,
        crew_email: user?.email,
        crew_phone: crewMember?.phone_number,
        start_date: data.start_date || show?.start_date || '',
        end_date: data.end_date || show?.end_date || '',
        status: 'not_sent',
        attached_at: new Date().toISOString(),
      });

      // Auto-create linked ProjectCrew
      if (show?.id) {
        const projectCrew = await db.entities.ProjectCrew.create({
          show_id: show.id,
          show_name: show.name,
          crew_booking_id: booking.id,
          crew_member_name: crewMember?.user_id || '',
          crew_member_email: user?.email || crewMember?.email || '',
          role: data.role || 'Crew Member',
          assignment_date: data.start_date,
          start_time: '',
          end_time: '',
          location: show.venue || '',
          quantity: 1,
          rate_type: data.rate_type || 'daily',
          internal_cost: data.rate || 0,
          billable_cost: data.rate || 0,
          internal_rate: data.rate || 0,
          billable_rate: data.rate || 0,
          notes: data.notes,
          assignment_status: 'not_sent',
        });

        await db.entities.CrewBooking.update(booking.id, {
          project_crew_id: projectCrew.id,
        });
      }

      return booking;
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['crewBookings'] });
      queryClient.invalidateQueries({ queryKey: ['projectCrew'] });

      setPendingBooking(booking);
      const show = shows.find(s => s.id === selectedShow);
      const crewMember = crew.find(c => c.id === selectedCrew);
      const user = users.find(u => u.id === crewMember?.user_id);

      setWorkflowShowData(show);
      setWorkflowRecipientEmail(user?.email || '');
      setInviteWorkflowOpen(true);
      setNewDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.CrewBooking.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crewBookings'] });
      queryClient.invalidateQueries({ queryKey: ['projectCrew'] });
    },
  });

  useEffect(() => {
    if (selectedShow) {
      const show = shows.find(s => s.id === selectedShow);
      if (show) {
        setStartDate(show.start_date || '');
        setEndDate(show.end_date || '');
        setAccommodation(show.venue || '');
      }
    }
  }, [selectedShow, shows]);

  const resetForm = () => {
    setSelectedShow('');
    setSelectedCrew('');
    setRole('');
    setRate('');
    setStartDate('');
    setEndDate('');
    setAccommodation('');
    setNotes('');
  };

  const handleCreate = () => {
    if (!selectedShow || !selectedCrew) return;
    createMutation.mutate({
      show_id: selectedShow,
      crew_id: selectedCrew,
      role: role || 'Crew Member',
      rate: parseFloat(rate) || 0,
      rate_type: rateType,
      start_date: startDate,
      end_date: endDate,
      accommodation,
      notes,
    });
  };

  const handleSendInvite = (booking) => {
    const show = shows.find(s => s.id === booking.show_id);
    setPendingBooking(booking);
    setWorkflowShowData(show);
    setWorkflowRecipientEmail(booking.crew_email);
    setInviteWorkflowOpen(true);
  };

  const getCrewName = (crewId) => {
    const crewMember = crew.find(c => c.id === crewId);
    if (!crewMember) return 'Unknown';
    const user = users.find(u => u.id === crewMember.user_id);
    return user?.full_name || crewMember.user_id || 'Unknown';
  };

  // Filter
  const filteredBookings = bookings.filter(b => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchSearch = !searchTerm ||
      b.show_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.crew_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.role?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Group by show
  const grouped = filteredBookings.reduce((acc, b) => {
    const key = b.show_name || 'Unknown Show';
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Crew Bookings"
        description="Invite crew members to shows — linked to project staffing assignments"
        actions={canManageCrew ? (
          <Button onClick={() => setNewDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Invite Crew
          </Button>
        ) : null}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search by show, person, or role..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] h-8 text-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="not_sent">Not Sent</SelectItem>
            <SelectItem value="pending">Invite Sent</SelectItem>
            <SelectItem value="confirmed">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = bookings.filter(b => b.status === key).length;
          if (count === 0) return null;
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-opacity ${cfg.className} ${statusFilter !== 'all' && statusFilter !== key ? 'opacity-40' : ''}`}
            >
              <Icon className="w-3 h-3" />
              {cfg.label}: {count}
            </button>
          );
        })}
      </div>

      {/* Bookings grouped by show */}
      {filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No crew bookings found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([showName, showBookings]) => (
            <div key={showName}>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">{showName}</h3>
              <div className="space-y-2">
                {showBookings.map(booking => {
                  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.not_sent;
                  const Icon = cfg.icon;
                  const show = shows.find(s => s.id === booking.show_id);

                  return (
                    <Card key={booking.id}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: Person + role + project */}
                          <div className="flex-1 min-w-0">
                            {/* Person + invite badge */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="font-semibold text-sm">{booking.crew_name || 'Unknown'}</span>
                              </div>
                              <Badge variant="outline" className={`text-xs flex items-center gap-1 ${cfg.className}`}>
                                <Icon className="w-3 h-3" />
                                {cfg.label}
                              </Badge>
                            </div>

                            {/* Role + Show */}
                            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                              {booking.role && (
                                <span className="flex items-center gap-1">
                                  <Briefcase className="w-3 h-3" />
                                  {booking.role}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {booking.show_name}
                              </span>
                              {(booking.start_date || show?.start_date) && (
                                <span className="flex items-center gap-1">
                                  {formatDateRange(booking.start_date || show?.start_date, booking.end_date || show?.end_date)}
                                </span>
                              )}
                              {booking.rate > 0 && (
                                <span>${booking.rate}/{booking.rate_type}</span>
                              )}
                            </div>

                            {/* Audit timeline */}
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground/70">
                              {booking.attached_at && !isNaN(new Date(booking.attached_at)) && (
                                <span>Assigned {format(new Date(booking.attached_at), 'MMM d, yyyy')}</span>
                              )}
                              {booking.email_sent_at && !isNaN(new Date(booking.email_sent_at)) && (
                                <span>· Invite sent {format(new Date(booking.email_sent_at), 'MMM d, h:mma')}
                                  {booking.sent_by && ` by ${booking.sent_by}`}
                                </span>
                              )}
                              {booking.responded_at && !isNaN(new Date(booking.responded_at)) && (
                                <span>· Responded {format(new Date(booking.responded_at), 'MMM d')}</span>
                              )}
                            </div>

                            {booking.notes && (
                              <p className="text-xs text-muted-foreground mt-2 italic">"{booking.notes}"</p>
                            )}
                          </div>

                          {/* Right: Actions */}
                          <div className="flex flex-col gap-1 shrink-0">
                            {canManageCrew && booking.crew_email && (
                              <Button
                                size="sm"
                                variant={booking.status === 'not_sent' ? 'default' : 'outline'}
                                className="h-8 text-xs"
                                onClick={() => handleSendInvite(booking)}
                              >
                                <Mail className="w-3 h-3 mr-1" />
                                {booking.status === 'not_sent' ? 'Send Invite' : 'Resend'}
                              </Button>
                            )}
                            {canManageCrew && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive">
                                    <Trash2 className="w-3 h-3 mr-1" /> Remove
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Booking</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Remove {booking.crew_name}'s booking for {booking.show_name}? This cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate(booking.id)} className="bg-destructive text-destructive-foreground">
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New booking dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Crew to Show</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleCreate(); }} className="space-y-4">
            <div>
              <Label>Project *</Label>
              <Select value={selectedShow} onValueChange={setSelectedShow}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {shows.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Crew Member *</Label>
              <Select value={selectedCrew} onValueChange={setSelectedCrew}>
                <SelectTrigger><SelectValue placeholder="Select crew" /></SelectTrigger>
                <SelectContent>
                  {crew.map(c => {
                    const user = users.find(u => u.id === c.user_id);
                    return <SelectItem key={c.id} value={c.id}>{user?.full_name || c.user_id}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Role (optional)</Label>
              <Input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Camera Op, A1, etc." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Rate (optional)</Label>
                <Input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="0.00" step="0.01" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={rateType} onValueChange={setRateType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Accommodation / Where Staying</Label>
              <Input value={accommodation} onChange={e => setAccommodation(e.target.value)} placeholder="Hotel, airbnb, address, etc." />
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions, etc." />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setNewDialogOpen(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" disabled={!selectedShow || !selectedCrew || createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create & Send Invite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Crew invite workflow */}
      <CrewInviteWorkflow
        open={inviteWorkflowOpen}
        onOpenChange={(open) => {
          setInviteWorkflowOpen(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ['crewBookings'] });
            queryClient.invalidateQueries({ queryKey: ['projectCrew'] });
          }
        }}
        crewBookingData={pendingBooking}
        crewBookingId={pendingBooking?.id}
        recipientEmail={workflowRecipientEmail}
        showData={workflowShowData}
      />
    </div>
  );
}