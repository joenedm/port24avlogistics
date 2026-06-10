import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, FileText, DollarSign, Clock, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/shared/PageHeader';
import { usePermissions } from '@/lib/usePermissions';

const STATUS_CONFIG = {
  draft:          { label: 'Draft',          color: 'bg-muted text-muted-foreground border-muted' },
  sent:           { label: 'Sent',           color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  paid:           { label: 'Paid',           color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  partially_paid: { label: 'Partial',        color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  overdue:        { label: 'Overdue',        color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

export default function Invoices() {
  const { canAccessFinance } = usePermissions();
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Invoice.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const filtered = statusFilter === 'all' ? invoices : invoices.filter(i => i.status === statusFilter);

  const totalOutstanding = invoices
    .filter(i => !['paid', 'draft'].includes(i.status))
    .reduce((s, i) => s + ((i.total || 0) - (i.amount_paid || 0)), 0);

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const overdue = invoices.filter(i => i.status === 'overdue').length;

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Track and manage all project invoices"
        actions={canAccessFinance ? <Link to="/invoices/new"><Button><Plus className="w-4 h-4 mr-2" /> New Invoice</Button></Link> : null}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-amber-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Outstanding</p>
          </div>
          <p className="text-2xl font-bold">${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Collected</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Overdue</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{overdue}</p>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'draft', 'sent', 'paid', 'partially_paid', 'overdue'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
              statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}>
            {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-center py-20 text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No invoices found.</p>
          <Link to="/invoices/new"><Button variant="outline" className="mt-4">Create Invoice</Button></Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => (
            <Card key={inv.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {inv.invoice_number && <span className="text-xs font-mono text-muted-foreground">#{inv.invoice_number}</span>}
                    <Badge variant="outline" className={cn('text-xs border', STATUS_CONFIG[inv.status]?.color)}>{STATUS_CONFIG[inv.status]?.label}</Badge>
                  </div>
                  <h3 className="font-semibold truncate">{inv.show_name}</h3>
                  <p className="text-sm text-muted-foreground">{inv.client}</p>
                  {inv.due_date && !isNaN(new Date(inv.due_date)) && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Due {format(new Date(inv.due_date), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold">${(inv.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  {inv.amount_paid > 0 && inv.status !== 'paid' && (
                    <p className="text-xs text-muted-foreground">${inv.amount_paid.toLocaleString()} paid</p>
                  )}
                  <div className="flex gap-2 mt-2 justify-end">
                     {canAccessFinance ? (
                       <Select value={inv.status} onValueChange={v => updateMutation.mutate({ id: inv.id, data: { status: v } })}>
                         <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                         <SelectContent>
                           {Object.entries(STATUS_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
                         </SelectContent>
                       </Select>
                     ) : (
                       <Badge variant="outline" className={cn('text-xs border', STATUS_CONFIG[inv.status]?.color)}>{STATUS_CONFIG[inv.status]?.label}</Badge>
                     )}
                     <Link to={`/invoices/${inv.id}`}>
                       <Button variant="outline" size="icon" className="h-7 w-7"><ExternalLink className="w-3 h-3" /></Button>
                     </Link>
                   </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}