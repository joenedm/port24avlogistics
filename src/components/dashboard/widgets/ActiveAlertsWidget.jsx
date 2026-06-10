import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function ActiveAlertsWidget() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts-active'],
    queryFn: async () => {
      const all = await base44.entities.Alert.list('-created_date', 20);
      return all.filter(a => a.status === 'active');
    },
    staleTime: 60000
  });

  if (isLoading) {
    return <Skeleton className="h-20" />;
  }

  const critical = alerts?.filter(a => a.severity === 'critical') || [];
  const warning = alerts?.filter(a => a.severity === 'warning') || [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{alerts?.length || 0}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Critical</p>
          <p className="text-2xl font-bold text-red-600">{critical.length}</p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {critical.length > 0 && <Badge className="bg-red-500/10 text-red-600">{critical.length} critical</Badge>}
        {warning.length > 0 && <Badge className="bg-amber-500/10 text-amber-600">{warning.length} warning</Badge>}
      </div>
    </div>
  );
}