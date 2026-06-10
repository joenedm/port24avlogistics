import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BudgetSummary({ projectCrew = [], postEventCosts = [], quote = null, subrents = [] }) {
  // Calculate crew costs
  const crewTotal = projectCrew.reduce((sum, c) => sum + (parseFloat(c.billable_cost) || 0), 0);
  const crewInternal = projectCrew.reduce((sum, c) => sum + (parseFloat(c.internal_cost) || 0), 0);

  // Calculate post-event costs
  const eventCostsTotal = postEventCosts.reduce((sum, c) => sum + (parseFloat(c.total_billable_cost) || 0), 0);
  const eventCostsInternal = postEventCosts.reduce((sum, c) => sum + (parseFloat(c.total_internal_cost) || 0), 0);

  // Calculate subrents as COSTS (expense layer that reduces margin)
  // Prefer internal_cost (new field); fall back to total_cost for backward compat
  const subrentsCost = subrents.reduce((sum, s) => sum + (parseFloat(s.internal_cost || s.total_cost) || 0), 0);

  // Use quote total (final amount after tax/discount) as the billable revenue figure.
  // Use quote subtotal as the "internal" equipment cost proxy (pre-markup fees).
  const quoteBillable = parseFloat(quote?.total) || 0;
  const quoteSubtotal = parseFloat(quote?.subtotal) || 0;

  // Calculate totals: subrents are a cost, not revenue
  const totalBillable = crewTotal + eventCostsTotal + quoteBillable;
  const totalInternal = crewInternal + eventCostsInternal + subrentsCost;
  const margin = totalBillable - totalInternal;
  const marginPct = totalBillable > 0 ? parseFloat(((margin / totalBillable) * 100).toFixed(1)) : 0;

  const budgetBreakdown = [
    { label: 'Equipment & Assets', value: quoteBillable, internal: quoteSubtotal },
    { label: 'Crew Labor', value: crewTotal, internal: crewInternal },
    { label: 'Post-Event Adjustments', value: eventCostsTotal, internal: eventCostsInternal },
    subrentsCost > 0 && { label: 'Roundtable Subrents (Cost)', value: 0, internal: subrentsCost, isCost: true },
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Billable</p>
            <p className="text-3xl font-bold">${totalBillable.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-2">Internal Cost: ${totalInternal.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Gross Margin</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-emerald-600">${margin.toFixed(2)}</p>
              <p className={cn("text-lg font-semibold", marginPct >= 20 ? 'text-emerald-600' : marginPct >= 0 ? 'text-amber-600' : 'text-red-600')}>
                {marginPct}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Budget Health</p>
            <div className="flex items-center gap-2 mt-1">
              {marginPct >= 20 ? (
                <>
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-600">Healthy</span>
                </>
              ) : marginPct >= 0 ? (
                <>
                  <TrendingDown className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-600">Tight</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-semibold text-red-600">Loss</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Budget Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {budgetBreakdown.map((item, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${item.isCost ? 'bg-red-500/5 border border-red-500/10' : 'bg-muted/30'}`}>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">Cost: ${item.internal.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  {item.isCost ? (
                    <p className="text-sm font-semibold text-red-600">-${item.internal.toFixed(2)}</p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold">${item.value.toFixed(2)}</p>
                      <p className="text-xs text-emerald-600">${(item.value - item.internal).toFixed(2)} margin</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}