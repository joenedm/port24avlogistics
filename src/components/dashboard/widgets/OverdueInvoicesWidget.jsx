import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function OverdueInvoicesWidget() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices-overdue'],
    queryFn: async () => {
      const all = await base44.entities.Invoice.list();
      return all.filter(i => i.status === 'overdue' || (i.due_date && new Date(i.due_date) < new Date()));
    },
    staleTime: 60000
  });

  if (isLoading) {
    return <Skeleton className="h-24" />;
  }

  const total = invoices?.reduce((sum, i) => sum + (i.amount_due || 0), 0) || 0;

  return (
    <div className="space-y-2">
      <div>
        <p className="text-2xl font-bold text-red-600">{invoices?.length || 0}</p>
        <p className="text-xs text-muted-foreground">invoices overdue</p>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">${(total / 1000).toFixed(1)}k</p>
        {invoices && invoices.length > 0 && (
          <Badge className="bg-red-500/10 text-red-600">Action needed</Badge>
        )}
      </div>
    </div>
  );
}