import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function AVHospitalWidget() {
  const { data: hospital, isLoading } = useQuery({
    queryKey: ['av-hospital'],
    queryFn: async () => {
      const all = await base44.entities.AVHospital.list();
      return all.filter(h => h.is_active);
    },
    staleTime: 60000
  });

  if (isLoading) {
    return <Skeleton className="h-24" />;
  }

  const underRepair = hospital?.filter(h => h.repair_status === 'under_repair').length || 0;
  const waiting = hospital?.filter(h => h.repair_status === 'waiting_inspection').length || 0;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-2xl font-bold">{hospital?.length || 0}</p>
        <p className="text-xs text-muted-foreground">items in hospital</p>
      </div>
      <div className="flex gap-2">
        {waiting > 0 && <Badge className="bg-yellow-500/10 text-yellow-600">{waiting} waiting</Badge>}
        {underRepair > 0 && <Badge className="bg-blue-500/10 text-blue-600">{underRepair} repairing</Badge>}
      </div>
    </div>
  );
}