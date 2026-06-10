import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { getPricingMethodLabel } from '@/lib/crewRoleCalculations';

export default function BillableValidationDialog({ role, onSaveAndContinue, onCancel }) {
  const [billableRate, setBillableRate] = useState('');

  const handleSave = () => {
    if (!billableRate || parseFloat(billableRate) <= 0) {
      alert('Please enter a valid billable rate');
      return;
    }
    onSaveAndContinue({ ...role, billable_rate: parseFloat(billableRate) });
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Missing Billable Amount
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900">
              The role <strong>{role.role_name}</strong> doesn't have a billable amount set. Please enter it to continue.
            </p>
          </div>

          <div className="space-y-2">
            <div>
              <Badge variant="outline">{role.department}</Badge>
              <p className="text-sm text-muted-foreground mt-1">
                Pricing Method: <strong>{getPricingMethodLabel(role.pricing_method)}</strong>
              </p>
            </div>

            <div>
              <Label className="text-sm">Internal Cost</Label>
              <p className="text-sm font-mono bg-muted p-2 rounded">
                ${role.pricing_method === 'hourly'
                  ? `${parseFloat(role.hourly_rate_internal || 0).toFixed(2)}/hr`
                  : role.pricing_method === 'fixed'
                  ? `${parseFloat(role.fixed_cost_internal || 0).toFixed(2)}`
                  : `${parseFloat(role.daily_rate_internal || 0).toFixed(2)}/day`
                }
              </p>
            </div>

            <div>
              <Label htmlFor="billable-rate">
                Billable {role.pricing_method === 'hourly' ? 'Rate / Hour' : role.pricing_method === 'days' ? 'Rate / Day' : 'Amount'} *
              </Label>
              <Input
                id="billable-rate"
                type="number"
                value={billableRate}
                onChange={(e) => setBillableRate(e.target.value)}
                placeholder="Enter billable amount"
                step="0.01"
                min="0"
                autoFocus
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave}>Save & Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}