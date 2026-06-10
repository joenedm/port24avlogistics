import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plane, Truck, Calculator } from 'lucide-react';

const TRAVEL_TYPES = [
  { value: 'crew_flight',     label: 'Crew Flight' },
  { value: 'crew_hotel',      label: 'Hotel / Accommodation' },
  { value: 'crew_rideshare',  label: 'Rideshare / Car Service' },
  { value: 'crew_rental_car', label: 'Rental Car (Crew)' },
  { value: 'crew_mileage',    label: 'Crew Mileage' },
  { value: 'crew_perdiem',    label: 'Per Diem' },
];

const TRANSPORT_TYPES = [
  { value: 'trucking',  label: 'Trucking / Freight' },
  { value: 'freight',   label: 'Freight Carrier' },
  { value: 'transport', label: 'Ground Transport / Van' },
  { value: 'general',   label: 'General Logistics' },
];

const ALL_TYPES = [...TRAVEL_TYPES, ...TRANSPORT_TYPES];
const TYPE_LABELS = Object.fromEntries(ALL_TYPES.map(t => [t.value, t.label]));
const TRANSPORT_TYPE_KEYS = new Set(TRANSPORT_TYPES.map(t => t.value));

function isTransportType(type) {
  return TRANSPORT_TYPE_KEYS.has(type);
}

/**
 * Project-specific edit dialog. Shows admin master info (read-only) at top,
 * then project-specific overrideable fields below.
 */
export default function LogisticsProjectEditDialog({ open, onOpenChange, formData, onChange, onSave, isSaving, isEditing, bankRecord, show }) {
  const type = formData.logistics_type;
  const isTransport = isTransportType(type);

  // Auto-populate mileage fields from bank record when dialog opens for transport
  // (TravelLogisticsPanel already pre-fills these, this is a safety net for edge cases)
  useEffect(() => {
    if (!open || !isTransport || !bankRecord) return;
    const updates = {};
    if (bankRecord.base_address && !formData.origin) updates.origin = bankRecord.base_address;
    if (show?.delivery_address && !formData.destination) updates.destination = show.delivery_address;
    if (bankRecord.rate_per_mile && !formData.mileage_rate) {
      updates.mileage_rate = bankRecord.rate_per_mile;
      updates.billable_mileage_rate = bankRecord.billable_rate_per_mile || '';
    }
    if (Object.keys(updates).length > 0) {
      onChange({ ...formData, ...updates });
    }
  }, [open, bankRecord?.id]);

  // Recalculate cost when mileage or rate changes (transport only)
  const handleMileageChange = (miles) => {
    const rate = parseFloat(formData.mileage_rate) || 0;
    const billableRate = parseFloat(formData.billable_mileage_rate) || 0;
    const cost = miles && rate ? (parseFloat(miles) * rate).toFixed(2) : formData.cost;
    const billable = miles && billableRate ? (parseFloat(miles) * billableRate).toFixed(2) : formData.billable_amount;
    onChange({ ...formData, mileage: miles, cost, billable_amount: billable, mileage_calculated: true });
  };

  const handleRateChange = (rate) => {
    const miles = parseFloat(formData.mileage) || 0;
    const cost = miles && rate ? (miles * parseFloat(rate)).toFixed(2) : formData.cost;
    onChange({ ...formData, mileage_rate: rate, cost, mileage_calculated: !!miles });
  };

  const handleBillableRateChange = (rate) => {
    const miles = parseFloat(formData.mileage) || 0;
    const billable = miles && rate ? (miles * parseFloat(rate)).toFixed(2) : formData.billable_amount;
    onChange({ ...formData, billable_mileage_rate: rate, billable_amount: billable });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Add'} Logistics Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Admin master info — read-only context panel */}
          {bankRecord && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">From Logistics Bank</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{bankRecord.name}</span>
                <Badge variant="outline" className="text-xs">{TYPE_LABELS[bankRecord.logistics_type] || bankRecord.logistics_type}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1">
                {bankRecord.vendor && <span>Vendor: {bankRecord.vendor}</span>}
                {bankRecord.contact_name && <span>Contact: {bankRecord.contact_name}</span>}
                {bankRecord.contact_phone && <span>{bankRecord.contact_phone}</span>}
                {bankRecord.contact_email && <span>{bankRecord.contact_email}</span>}
                {bankRecord.origin && bankRecord.destination && <span>{bankRecord.origin} → {bankRecord.destination}</span>}
                {bankRecord.vehicle_type && <span>{bankRecord.vehicle_type}</span>}
              </div>
              {bankRecord.description && (
                <p className="text-xs text-muted-foreground/70 italic mt-1">{bankRecord.description}</p>
              )}
            </div>
          )}

          {/* Type selector — only when not coming from bank */}
          {!bankRecord && (
            <div>
              <Label className="text-xs">Type *</Label>
              <Select value={formData.logistics_type || 'crew_flight'} onValueChange={v => onChange({ ...formData, logistics_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_h_travel" disabled className="text-xs font-bold text-blue-400 uppercase">Travel (People)</SelectItem>
                  {TRAVEL_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="pl-4">{t.label}</SelectItem>)}
                  <SelectItem value="_h_transport" disabled className="text-xs font-bold text-orange-400 uppercase mt-1">Transport (Gear)</SelectItem>
                  {TRANSPORT_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="pl-4">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Project-specific description override */}
          <div>
            <Label className="text-xs">Description *</Label>
            <Input
              placeholder="e.g. Flight LAX→JFK for John, Hotel for load-in crew"
              value={formData.description}
              onChange={e => onChange({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <Label className="text-xs">Quantity</Label>
            <Input
              type="number"
              min="1"
              step="1"
              placeholder="1"
              value={formData.quantity || 1}
              onChange={e => {
                const qty = parseFloat(e.target.value) || 1;
                const unitCost = parseFloat(formData.unit_cost) || 0;
                const unitBillable = parseFloat(formData.unit_billable) || 0;
                onChange({
                  ...formData,
                  quantity: qty,
                  cost: unitCost ? (unitCost * qty).toFixed(2) : formData.cost,
                  billable_amount: unitBillable ? (unitBillable * qty).toFixed(2) : formData.billable_amount,
                });
              }}
            />
          </div>

          <div>
            <Label className="text-xs">Assigned Person</Label>
            <Input
              placeholder="Crew member, driver, etc."
              value={formData.assigned_person}
              onChange={e => onChange({ ...formData, assigned_person: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Origin / From</Label>
              <Input
                placeholder="City or address"
                value={formData.origin}
                onChange={e => onChange({ ...formData, origin: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Destination / To</Label>
              <Input
                placeholder="City or address"
                value={formData.destination}
                onChange={e => onChange({ ...formData, destination: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Pickup / Departure</Label>
              <Input
                type="datetime-local"
                value={formData.pickup_datetime}
                onChange={e => onChange({ ...formData, pickup_datetime: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Delivery / Arrival</Label>
              <Input
                type="datetime-local"
                value={formData.delivery_datetime}
                onChange={e => onChange({ ...formData, delivery_datetime: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Load-in Date/Time</Label>
              <Input
                type="datetime-local"
                value={formData.load_in_datetime}
                onChange={e => onChange({ ...formData, load_in_datetime: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Load-out Date/Time</Label>
              <Input
                type="datetime-local"
                value={formData.load_out_datetime}
                onChange={e => onChange({ ...formData, load_out_datetime: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Confirmation #</Label>
            <Input
              placeholder="Booking reference"
              value={formData.confirmation_number}
              onChange={e => onChange({ ...formData, confirmation_number: e.target.value })}
            />
          </div>

          {/* Mileage Calculator — Transport only */}
          {isTransport && (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-primary">Mileage-Based Cost Calculator</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Miles</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={formData.mileage || ''}
                    onChange={e => handleMileageChange(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Rate / Mile (Internal)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={bankRecord?.rate_per_mile ? `${bankRecord.rate_per_mile}` : '0.00'}
                    value={formData.mileage_rate || ''}
                    onChange={e => handleRateChange(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Rate / Mile (Billable)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={bankRecord?.billable_rate_per_mile ? `${bankRecord.billable_rate_per_mile}` : '0.00'}
                    value={formData.billable_mileage_rate || ''}
                    onChange={e => handleBillableRateChange(e.target.value)}
                  />
                </div>
              </div>
              {formData.mileage && formData.mileage_rate && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
                  {formData.mileage} mi × ${parseFloat(formData.mileage_rate).toFixed(2)}/mi = <span className="font-semibold text-foreground">${(parseFloat(formData.mileage) * parseFloat(formData.mileage_rate)).toFixed(2)}</span>
                  {formData.billable_mileage_rate && <> &nbsp;·&nbsp; Billable: <span className="font-semibold text-primary">${(parseFloat(formData.mileage) * parseFloat(formData.billable_mileage_rate)).toFixed(2)}</span></>}
                </div>
              )}
            </div>
          )}

          {/* Cost fields — per-unit, totals auto-calculated from quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Cost per Unit {isTransport && <span className="text-muted-foreground font-normal">(auto-calculated)</span>}</Label>
              <Input
                type="number"
                placeholder={bankRecord?.default_cost ? `Default: $${bankRecord.default_cost}` : '0.00'}
                step="0.01"
                value={formData.unit_cost ?? formData.cost}
                onChange={e => {
                  const unitCost = e.target.value;
                  const qty = parseFloat(formData.quantity) || 1;
                  onChange({ ...formData, unit_cost: unitCost, cost: unitCost ? (parseFloat(unitCost) * qty).toFixed(2) : '', mileage_calculated: false });
                }}
              />
            </div>
            <div>
              <Label className="text-xs">Billable per Unit <span className="text-muted-foreground font-normal">(charged to client)</span></Label>
              <Input
                type="number"
                placeholder={bankRecord?.default_billable_amount ? `Default: $${bankRecord.default_billable_amount}` : '0.00'}
                step="0.01"
                value={formData.unit_billable ?? formData.billable_amount}
                onChange={e => {
                  const unitBillable = e.target.value;
                  const qty = parseFloat(formData.quantity) || 1;
                  onChange({ ...formData, unit_billable: unitBillable, billable_amount: unitBillable ? (parseFloat(unitBillable) * qty).toFixed(2) : '' });
                }}
              />
            </div>
          </div>
          {/* Show totals when qty > 1 */}
          {(parseFloat(formData.quantity) || 1) > 1 && (
            <div className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1.5 flex gap-4">
              {formData.unit_cost && <span>Internal Total: <span className="font-semibold text-foreground">${(parseFloat(formData.unit_cost || 0) * (parseFloat(formData.quantity) || 1)).toFixed(2)}</span></span>}
              {formData.unit_billable && <span>Billable Total: <span className="font-semibold text-primary">${(parseFloat(formData.unit_billable || 0) * (parseFloat(formData.quantity) || 1)).toFixed(2)}</span></span>}
            </div>
          )}

          <div>
            <Label className="text-xs">Status</Label>
            <Select value={formData.status} onValueChange={v => onChange({ ...formData, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Project Notes</Label>
            <Textarea
              placeholder="Project-specific notes, instructions, route details..."
              value={formData.notes}
              onChange={e => onChange({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={isSaving || !formData.description?.trim()}>
            {isEditing ? 'Update Item' : 'Add to Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}