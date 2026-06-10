import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { User, Briefcase, Calendar, Mail, Trash2, Edit2, Clock, CheckCircle2, XCircle, Send, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { formatDateRange } from '@/lib/dateRange';

const STATUS_CONFIG = {
  not_sent:  { label: 'Not Sent',    className: 'bg-slate-500/10 text-slate-400 border-slate-500/20',       icon: Clock },
  pending:   { label: 'Invite Sent', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',          icon: Send },
  confirmed: { label: 'Accepted',    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  declined:  { label: 'Declined',    className: 'bg-red-500/10 text-red-400 border-red-500/20',             icon: XCircle },
  cancelled: { label: 'Cancelled',   className: 'bg-slate-500/10 text-slate-400 border-slate-500/20',       icon: XCircle },
};

export default function ProjectCrewCard({ crew, booking, show, personName, isTBD, onInvite, onEdit, onDelete }) {
  const cfg = STATUS_CONFIG[booking?.status || 'not_sent'] || STATUS_CONFIG.not_sent;
  const Icon = cfg.icon;

  const dateRange = formatDateRange(
    booking?.start_date || show?.start_date || crew.assignment_date,
    booking?.end_date || show?.end_date || ''
  );

  const rate = booking?.rate || crew.billable_rate || crew.internal_rate;
  const rateType = booking?.rate_type || crew.rate_type;

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: all info */}
          <div className="flex-1 min-w-0">

            {/* Row 1: Name + Status badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-semibold text-sm">
                  {isTBD ? <span className="italic text-muted-foreground">TBD — Unassigned</span> : personName || 'Unknown'}
                </span>
              </div>
              <Badge variant="outline" className={`text-xs flex items-center gap-1 ${cfg.className}`}>
                <Icon className="w-3 h-3" />
                {cfg.label}
              </Badge>
              {crew.billable_rate_missing && (
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20">
                  No Billable Rate
                </Badge>
              )}
            </div>

            {/* Row 2: Role + Show + Date range + Rate */}
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
              {crew.role && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {crew.role}
                </span>
              )}
              {show?.name && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {show.name}
                </span>
              )}
              {dateRange && (
                <span className="flex items-center gap-1">
                  {dateRange}
                </span>
              )}
              {rate > 0 && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  ${rate}/{rateType || 'fixed'}
                </span>
              )}
              {crew.internal_cost > 0 && (
                <span className="text-muted-foreground/60">
                  Cost ${crew.internal_cost?.toFixed(0)} → Bill ${crew.billable_cost?.toFixed(0)}
                </span>
              )}
            </div>

            {/* Row 3: Audit trail */}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground/70">
              {booking?.attached_at && (
                <span>Assigned {format(new Date(booking.attached_at), 'MMM d, yyyy')}</span>
              )}
              {booking?.email_sent_at && (
                <span>· Invite sent {format(new Date(booking.email_sent_at), 'MMM d, h:mma')}
                  {booking.sent_by && ` by ${booking.sent_by}`}
                </span>
              )}
              {booking?.responded_at && (
                <span>· Responded {format(new Date(booking.responded_at), 'MMM d')}</span>
              )}
            </div>

            {crew.notes && (
              <p className="text-xs text-muted-foreground mt-2 italic">"{crew.notes}"</p>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col gap-1 shrink-0">
            <Button
              size="sm"
              variant={!booking || booking.status === 'not_sent' ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => onInvite(crew)}
              disabled={isTBD}
              title={isTBD ? 'Assign a crew member first' : undefined}
            >
              <Mail className="w-3 h-3 mr-1" />
              {!booking || booking.status === 'not_sent' ? 'Send Invite' : 'Resend'}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => onEdit(crew)}
            >
              <Edit2 className="w-3 h-3 mr-1" /> Edit
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive">
                  <Trash2 className="w-3 h-3 mr-1" /> Remove
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Crew Assignment</AlertDialogTitle>
                  <AlertDialogDescription>
                    Remove {isTBD ? 'this TBD slot' : personName} ({crew.role}) from this project? This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(crew.id)} className="bg-destructive text-destructive-foreground">
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}