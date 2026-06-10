import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Building2, Handshake, Search, Plus, ChevronRight, ArrowLeft, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import RoundtableBadge from '@/components/roundtable/RoundtableBadge';

// Steps: partner → method → item/manual
export default function SubRentAddForm({ onAdd, onCancel }) {
  const [step, setStep] = useState('partner'); // 'partner' | 'method' | 'from_inventory' | 'company_fulfilled'
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [search, setSearch] = useState('');

  // Manual request fields
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState(1);
  const [manualInternalCost, setManualInternalCost] = useState('');
  const [manualBillable, setManualBillable] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualVendorRef, setManualVendorRef] = useState('');

  const { data: partners = [], isLoading: loadingPartners } = useQuery({
    queryKey: ['roundtable_partners'],
    queryFn: () => db.entities.RoundtablePartner.list('-created_date', 100),
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['roundtable_items'],
    queryFn: () => db.entities.RoundtableItem.list('-created_date', 500),
    enabled: step === 'from_inventory',
  });

  const partnerItems = useMemo(
    () => allItems.filter(i => i.partner_id === selectedPartner?.id),
    [allItems, selectedPartner]
  );

  const filteredItems = search.trim()
    ? partnerItems.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.category || '').toLowerCase().includes(search.toLowerCase())
      )
    : partnerItems;

  const handleSelectInventoryItem = (item) => {
    onAdd({
      partner_id: selectedPartner.id,
      partner_name: selectedPartner.company_name,
      item_id: item.id,
      item_name: item.name,
      source_type: 'from_inventory',
      category: item.category || '',
      quantity: 1,
      daily_rate: item.daily_rate || 0,
      internal_cost: item.daily_rate || 0,
      billable_amount: item.daily_rate || 0,
      total_cost: item.daily_rate || 0,
    });
  };

  const handleManualAdd = () => {
    if (!manualName.trim()) return;
    const intCost = parseFloat(manualInternalCost) || 0;
    const billable = parseFloat(manualBillable) || 0;
    onAdd({
      partner_id: selectedPartner.id,
      partner_name: selectedPartner.company_name,
      item_id: null,
      item_name: manualName.trim(),
      source_type: 'company_fulfilled',
      quantity: parseInt(manualQty) || 1,
      internal_cost: intCost,
      billable_amount: billable,
      total_cost: intCost,
      notes: manualNotes.trim() || undefined,
      vendor_reference: manualVendorRef.trim() || undefined,
    });
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        {step !== 'partner' && (
          <button
            onClick={() => setStep(step === 'method' ? 'partner' : 'method')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <Handshake className="w-3.5 h-3.5 text-amber-500" />
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide">
            {step === 'partner' && 'Choose Partner'}
            {step === 'method' && `Via ${selectedPartner?.company_name}`}
            {step === 'from_inventory' && `Browse ${selectedPartner?.company_name}'s Inventory`}
            {step === 'company_fulfilled' && `Request from ${selectedPartner?.company_name}`}
          </p>
        </div>
      </div>

      {/* STEP 1: Choose partner */}
      {step === 'partner' && (
        <>
          {loadingPartners && <p className="text-xs text-muted-foreground py-3 text-center">Loading partners…</p>}
          {!loadingPartners && partners.length === 0 && (
            <div className="text-center py-6">
              <Handshake className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No Roundtable partners yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Add partners in the Roundtable section first.</p>
            </div>
          )}
          <div className="space-y-1.5">
            {partners.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedPartner(p); setStep('method'); }}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all text-left"
              >
                {p.logo_url
                  ? <img src={p.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-muted p-0.5 shrink-0" />
                  : <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-amber-500" />
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.company_name}</p>
                  {p.contact_name && <p className="text-xs text-muted-foreground">{p.contact_name}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </>
      )}

      {/* STEP 2: Choose method */}
      {step === 'method' && (
        <div className="space-y-2">
          <button
            onClick={() => { setSearch(''); setStep('from_inventory'); }}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Package className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">From Their Inventory</p>
              <p className="text-xs text-muted-foreground mt-0.5">Browse items listed in this partner's catalog</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>

          <button
            onClick={() => setStep('company_fulfilled')}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <Handshake className="w-4.5 h-4.5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Company Fulfilled</p>
              <p className="text-xs text-muted-foreground mt-0.5">They'll source it — item doesn't have to be listed</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </div>
      )}

      {/* STEP 3A: From inventory */}
      {step === 'from_inventory' && (
        <>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-7 h-8 text-sm"
              autoFocus
            />
          </div>

          <ScrollArea className="max-h-52">
            {partnerItems.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">No items listed for this partner.</p>
                <button
                  className="text-xs text-amber-500 hover:underline mt-2 block mx-auto"
                  onClick={() => setStep('company_fulfilled')}
                >
                  Request a company-fulfilled item instead →
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No matching items</p>
            ) : (
              <div className="space-y-1">
                {filteredItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectInventoryItem(item)}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-amber-500/10 text-left transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <div className="flex gap-2 items-center">
                        {item.category && <span className="text-xs text-muted-foreground">{item.category}</span>}
                        {item.qty_available > 1 && <span className="text-xs text-muted-foreground">×{item.qty_available}</span>}
                      </div>
                    </div>
                    {item.daily_rate > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">${item.daily_rate}/day</span>
                    )}
                    <Plus className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </>
      )}

      {/* STEP 3B: Company fulfilled (manual request) */}
      {step === 'company_fulfilled' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Item / Description *</label>
              <Input
                placeholder="What do you need?"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="w-20">
              <label className="text-xs text-muted-foreground mb-1 block">Qty</label>
              <Input
                type="number" min="1"
                value={manualQty}
                onChange={e => setManualQty(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Internal Cost ($)</label>
              <Input
                type="number" min="0" step="0.01"
                placeholder="0.00"
                value={manualInternalCost}
                onChange={e => setManualInternalCost(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Billable to Client ($)</label>
              <Input
                type="number" min="0" step="0.01"
                placeholder="0.00"
                value={manualBillable}
                onChange={e => setManualBillable(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Vendor Reference / PO</label>
            <Input
              placeholder="Optional reference number"
              value={manualVendorRef}
              onChange={e => setManualVendorRef(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
            <Input
              placeholder="Delivery notes, specs, etc."
              value={manualNotes}
              onChange={e => setManualNotes(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <Button
            size="sm"
            className="w-full bg-amber-500/90 hover:bg-amber-500 text-white"
            onClick={handleManualAdd}
            disabled={!manualName.trim()}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Sub-Rent Request
          </Button>
        </div>
      )}

    </div>
  );
}