import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function EquipmentStatus({ assets = [], quote = null }) {
  const totalItems = assets.length;
  const checkedOut = assets.filter(a => a.status === 'checked_out').length;
  const available = assets.filter(a => a.status === 'available').length;
  const maintenance = assets.filter(a => a.status === 'maintenance').length;

  const packPct = totalItems > 0 ? Math.round((checkedOut / totalItems) * 100) : 0;

  // Category breakdown
  const byCategory = {};
  assets.forEach(a => {
    const cat = a.category || 'Other';
    if (!byCategory[cat]) {
      byCategory[cat] = { total: 0, checkedOut: 0 };
    }
    byCategory[cat].total += 1;
    if (a.status === 'checked_out') byCategory[cat].checkedOut += 1;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-baseline gap-2 mb-1">
              <Package className="w-4 h-4 text-primary" />
              <p className="text-3xl font-bold">{totalItems}</p>
            </div>
            <p className="text-sm text-muted-foreground">Total Equipment</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-baseline gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <p className="text-3xl font-bold text-emerald-600">{checkedOut}</p>
            </div>
            <p className="text-sm text-muted-foreground">Packed</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-baseline gap-2 mb-1">
              <Package className="w-4 h-4 text-amber-600" />
              <p className="text-3xl font-bold text-amber-600">{available}</p>
            </div>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Pack Progress</p>
            <p className="text-3xl font-bold">{packPct}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">By Category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(byCategory)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([category, data]) => {
              const catPct = data.total > 0 ? Math.round((data.checkedOut / data.total) * 100) : 0;
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{category}</Badge>
                    <span className="text-sm font-semibold">{data.checkedOut}/{data.total}</span>
                  </div>
                  <Progress value={catPct} className="h-1.5" />
                </div>
              );
            })}
        </CardContent>
      </Card>

      {maintenance > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex items-center gap-2 pt-6">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-700">{maintenance} item(s) in maintenance</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}