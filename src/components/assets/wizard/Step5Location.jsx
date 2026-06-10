import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Archive } from 'lucide-react';
import AssetContainerSection from '@/components/containers/AssetContainerSection';

export default function Step5Location({ formData, set, partners }) {
  return (
    <div className="space-y-5">
      {/* Location */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Storage Location</Label>
          <Input value={formData.location || ''} onChange={e => set('location', e.target.value)} placeholder="e.g. Warehouse, Case Room" />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={formData.status || 'available'} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="checked_out">Checked Out</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Condition</Label>
          <Select value={formData.condition || 'good'} onValueChange={v => set('condition', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="excellent">Excellent</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="poor">Poor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Purchase Date</Label>
          <Input type="date" value={formData.purchase_date || ''} onChange={e => set('purchase_date', e.target.value)} />
        </div>
      </div>

      {/* Ownership */}
      <div className="border-t pt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" /> Ownership
        </p>
        <div className="flex gap-3 mb-3">
          {[
            { value: 'owned', label: 'Owned by Us', desc: 'Our own gear' },
            { value: 'partner_stored', label: 'Partner Stored', desc: 'Belongs to a Roundtable partner' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set('ownership_type', opt.value)}
              className={`flex-1 text-left p-3 rounded-lg border-2 transition-all ${
                formData.ownership_type === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
        </div>

      {/* Container / Storage section — not for cloud kits */}
      {formData.item_type !== 'cloud_kit' && (
        <div className="border-t pt-4">
          <AssetContainerSection formData={formData} set={set} />
        </div>
      )}

        {formData.ownership_type === 'partner_stored' && (
          <div className="space-y-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div>
              <Label>Partner Company *</Label>
              <Select
                value={formData.partner_owner_id || ''}
                onValueChange={v => {
                  const p = partners.find(p => p.id === v);
                  set('partner_owner_id', v);
                  set('partner_owner_name', p?.company_name || '');
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select partner…" /></SelectTrigger>
                <SelectContent>
                  {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Available for Our Shows</p>
                <p className="text-xs text-muted-foreground">Can be allocated to our projects?</p>
              </div>
              <Switch checked={formData.partner_use_allowed !== false} onCheckedChange={v => set('partner_use_allowed', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Approval Required</p>
                <p className="text-xs text-muted-foreground">Partner must approve each use</p>
              </div>
              <Switch checked={!!formData.partner_approval_required} onCheckedChange={v => set('partner_approval_required', v)} />
            </div>
            <div>
              <Label>Agreement / Storage Notes</Label>
              <Textarea
                value={formData.partner_agreement_notes || ''}
                onChange={e => set('partner_agreement_notes', e.target.value)}
                rows={2}
                placeholder="Storage terms, contact info, restrictions…"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}