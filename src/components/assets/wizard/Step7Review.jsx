import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Package, Tag, MapPin, DollarSign, Barcode, FileText } from 'lucide-react';

const Row = ({ label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right">{String(value)}</span>
    </div>
  );
};

const Section = ({ icon: Icon, title, children }) => (
  <div className="rounded-xl border border-border bg-muted/20 p-4">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-primary" />
      <p className="text-sm font-semibold">{title}</p>
    </div>
    <div>{children}</div>
  </div>
);

const ITEM_TYPE_LABELS = {
  physical_item: 'Physical Item',
  physical_kit: 'Physical Kit',
  cloud_kit: 'Cloud Kit',
  consumable: 'Consumable',
  bulk: 'Bulk Item',
};

export default function Step7Review({ formData }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Review the details below before saving.</p>

      <Section icon={Package} title="Item Type & Identity">
        <Row label="Type" value={ITEM_TYPE_LABELS[formData.item_type] || formData.item_type} />
        <Row label="Name" value={formData.name} />
        <Row label="Category" value={formData.category} />
        <Row label="Manufacturer" value={formData.manufacturer} />
        <Row label="Model" value={formData.model} />
      </Section>

      <Section icon={Barcode} title="Tracking">
        <Row label="Method" value={formData.tracking} />
        <Row label="Asset #" value={formData.asset_number} />
        <Row label="Barcode" value={formData.barcode} />
        {formData.tracking === 'serialized' && (
          <Row label="Serials" value={(formData.added_serials || []).join(', ') || '(none yet)'} />
        )}
        {(formData.tracking === 'bulk' || formData.tracking === 'consumable') && (
          <Row label="Quantity" value={formData.quantity} />
        )}
      </Section>

      <Section icon={DollarSign} title="Pricing">
        <Row label="Daily Rate" value={formData.daily_rate ? `$${formData.daily_rate}` : null} />
        <Row label="Replacement Value" value={formData.replacement_value ? `$${formData.replacement_value}` : null} />
        <Row label="Purchase Price" value={formData.purchase_price ? `$${formData.purchase_price}` : null} />
        <Row label="Pricing Tier" value={formData.pricing_tier} />
        <Row label="Max Discount" value={formData.max_discount_pct ? `${formData.max_discount_pct}%` : null} />
        <Row label="Taxable" value={formData.taxable === false ? 'No' : 'Yes'} />
        <Row label="Discountable" value={formData.discountable === false ? 'No' : 'Yes'} />
      </Section>

      <Section icon={MapPin} title="Location & Status">
        <Row label="Location" value={formData.location} />
        <Row label="Status" value={formData.status} />
        <Row label="Condition" value={formData.condition} />
        <Row label="Ownership" value={formData.ownership_type === 'partner_stored' ? `Partner Stored — ${formData.partner_owner_name}` : 'Owned by Us'} />
      </Section>

      {(formData.weight_kg || formData.vendor || formData.notes) && (
        <Section icon={FileText} title="Extra Details">
          <Row label="Weight (kg)" value={formData.weight_kg} />
          <Row label="Vendor" value={formData.vendor} />
          <Row label="Country of Origin" value={formData.country_of_origin} />
          <Row label="Notes" value={formData.notes} />
        </Section>
      )}
    </div>
  );
}