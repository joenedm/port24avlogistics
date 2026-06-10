import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';

export default function BillingSummaryWidget() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices-summary'],
    queryFn: async () => {
      return await base44.entities.Invoice.list();
    },
    staleTime: 60000
  });

  if (isLoading) {
    return <Skeleton className="h-24" />;
  }

  const paid = invoices?.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0) || 0;
  const pending = invoices?.filter(i => ['draft', 'sent', 'viewed'].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0) || 0;
  const overdue = invoices?.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.amount_due || 0), 0) || 0;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-muted-foreground">This Month</p>
        <p className="text-2xl font-bold">${(paid / 1000).toFixed(1)}k</p>
      </div>
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pending:</span>
          <span>${(pending / 1000).toFixed(1)}k</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Overdue:</span>
          <span className="text-red-600">${(overdue / 1000).toFixed(1)}k</span>
        </div>
      </div>
    </div>
  );
}