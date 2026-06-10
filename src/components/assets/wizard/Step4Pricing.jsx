import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DollarSign } from 'lucide-react';

export default function Step4Pricing({ formData, set }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Daily Rental Rate ($)</Label>
          <div className="relative mt-1">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="number" step="0.01" min="0"
              value={formData.daily_rate || ''}
              onChange={e => set('daily_rate', e.target.value)}
              className="pl-8"
              placeholder="0.00"
            />
          </div>
        </div>
        <div>
          <Label>Replacement Value ($)</Label>
          <div className="relative mt-1">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="number" step="0.01" min="0"
              value={formData.replacement_value || ''}
              onChange={e => set('replacement_value', e.target.value)}
              className="pl-8"
              placeholder="0.00"
            />
          </div>
        </div>
        <div>
          <Label>Purchase / Internal Cost ($)</Label>
          <div className="relative mt-1">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="number" step="0.01" min="0"
              value={formData.purchase_price || ''}
              onChange={e => set('purchase_price', e.target.value)}
              className="pl-8"
              placeholder="0.00"
            />
          </div>
        </div>
        <div>
          <Label>Subrent Cost ($)</Label>
          <div className="relative mt-1">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="number" step="0.01" min="0"
              value={formData.subrent_cost || ''}
              onChange={e => set('subrent_cost', e.target.value)}
              className="pl-8"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4 grid grid-cols-2 gap-4">
        <div>
          <Label>Pricing Tier</Label>
          <Select value={formData.pricing_tier || 'retail'} onValueChange={v => set('pricing_tier', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="repeat">Repeat Client</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Max Discount %</Label>
          <Input
            type="number" min="0" max="100"
            value={formData.max_discount_pct ?? 50}
            onChange={e => set('max_discount_pct', e.target.value)}
          />
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Taxable</p>
            <p className="text-xs text-muted-foreground">Apply tax when included in quotes/invoices</p>
          </div>
          <Switch checked={formData.taxable !== false} onCheckedChange={v => set('taxable', v)} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Discountable</p>
            <p className="text-xs text-muted-foreground">Allow discounts to be applied to this item</p>
          </div>
          <Switch checked={formData.discountable !== false} onCheckedChange={v => set('discountable', v)} />
        </div>
      </div>
    </div>
  );
}