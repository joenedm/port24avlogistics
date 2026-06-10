import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, CheckCircle2, Download, AlertTriangle } from 'lucide-react';

const STAT_TYPES = {
  total_assets: {
    label: 'Total Assets',
    icon: Package,
    color: 'text-blue-600'
  },
  available_assets: {
    label: 'Available',
    icon: CheckCircle2,
    color: 'text-emerald-600'
  },
  checked_out: {
    label: 'Checked Out',
    icon: Download,
    color: 'text-amber-600'
  },
  in_hospital: {
    label: 'In Hospital',
    icon: AlertTriangle,
    color: 'text-red-600'
  }
};

export default function StatCard({ type }) {
  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets-summary'],
    queryFn: async () => {
      const all = await db.entities.Asset.list();
      return all;
    },
    staleTime: 60000
  });

  const config = STAT_TYPES[type];

  const getValue = () => {
    if (!assets) return 0;
    switch (type) {
      case 'total_assets':
        return assets.length;
      case 'available_assets':
        return assets.filter(a => a.status === 'available').length;
      case 'checked_out':
        return assets.filter(a => a.status === 'checked_out').length;
      case 'in_hospital':
        return assets.filter(a => a.status === 'maintenance' || a.is_lost).length;
      default:
        return 0;
    }
  };

  const IconComponent = config.icon;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <IconComponent className="w-6 h-6 text-muted-foreground" />
        <h3 className="text-sm text-muted-foreground">{config.label}</h3>
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p className={`text-3xl font-bold ${config.color}`}>{getValue().toLocaleString()}</p>
      )}
    </div>
  );
}