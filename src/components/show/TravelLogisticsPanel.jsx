import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Hotel, Truck, MapPin, DollarSign, Calendar, Plus, Trash2, Edit2, Users, Package } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import LogisticsPoolSelector from './LogisticsPoolSelector';
import LogisticsProjectEditDialog from './LogisticsProjectEditDialog';

const LOGISTICS_TYPES = {
  crew_flight:    { label: 'Crew Flight',            icon: Plane,      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',    category: 'travel' },
  crew_hotel:     { label: 'Hotel / Accommodation',  icon: Hotel,      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', category: 'travel' },
  crew_rental_car:{ label: 'Rental Car (Crew)',      icon: Truck,      color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',    category: 'travel' },
  crew_rideshare: { label: 'Rideshare/Car Service',  icon: Truck,      color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',    category: 'travel' },
  crew_mileage:   { label: 'Crew Mileage',           icon: MapPin,     color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', category: 'travel' },
  crew_perdiem:   { label: 'Per Diem',               icon: DollarSign, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', category: 'travel' },
  trucking:       { label: 'Trucking/Freight',       icon: Truck,      color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', category: 'transport' },
  freight:        { label: 'Freight Carrier',        icon: Truck,      color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', category: 'transport' },
  transport:      { label: 'Ground Transport / Van', icon: Truck,      color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', category: 'transport' },
  general:        { label: 'General Logistics',      icon: MapPin,     color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',  category: 'transport' },
};

const STATUS_COLORS = {
  pending:    'bg-amber-500/15 text-amber-600',
  confirmed:  'bg-emerald-500/15 text-emerald-600',
  in_transit: 'bg-blue-500/15 text-blue-600',
  delivered:  'bg-emerald-500/15 text-emerald-600',
  cancelled:  'bg-red-500/15 text-red-600',
};

const EMPTY_FORM = {
  description: '',
  quantity: 1,
  assigned_person: '',
  origin: '',
  destination: '',
  pickup_datetime: '',
  delivery_datetime: '',
  load_in_datetime: '',
  load_out_datetime: '',
  confirmation_number: '',
  unit_cost: '',
  unit_billable: '',
  cost: '',
  billable_amount: '',
  status: 'pending',
  notes: '',
};

export default function TravelLogisticsPanel({ showId, show }) {
  const queryClient = useQueryClient();
  const [poolOpen, setPoolOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeBankRecord, setActiveBankRecord] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: items = [] } = useQuery({
    queryKey: ['travelLogistics', showId],
    queryFn: () => db.entities.TravelLogistic.filter({ show_id: showId }, '-created_date'),
    enabled: !!showId,
  });

  const createMutation = useMutation({
    mutationFn: (data) =>
      db.entities.TravelLogistic.create({
        ...data,
        show_id: showId,
        show_name: show?.name,
        quantity: parseFloat(data.quantity) || 1,
        unit_cost: data.unit_cost ? parseFloat(data.unit_cost) : undefined,
        unit_billable: data.unit_billable ? parseFloat(data.unit_billable) : undefined,
        cost: data.cost ? parseFloat(data.cost) : 0,
        billable_amount: data.billable_amount ? parseFloat(data.billable_amount) : 0,
        mileage: data.mileage ? parseFloat(data.mileage) : undefined,
        mileage_rate: data.mileage_rate ? parseFloat(data.mileage_rate) : undefined,
        billable_mileage_rate: data.billable_mileage_rate ? parseFloat(data.billable_mileage_rate) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travelLogistics', showId] });
      setEditOpen(false);
      setFormData(EMPTY_FORM);
      setActiveBankRecord(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) =>
      db.entities.TravelLogistic.update(id, {
        ...data,
        quantity: parseFloat(data.quantity) || 1,
        unit_cost: data.unit_cost ? parseFloat(data.unit_cost) : undefined,
        unit_billable: data.unit_billable ? parseFloat(data.unit_billable) : undefined,
        cost: data.cost ? parseFloat(data.cost) : 0,
        billable_amount: data.billable_amount ? parseFloat(data.billable_amount) : 0,
        mileage: data.mileage ? parseFloat(data.mileage) : undefined,
        mileage_rate: data.mileage_rate ? parseFloat(data.mileage_rate) : undefined,
        billable_mileage_rate: data.billable_mileage_rate ? parseFloat(data.billable_mileage_rate) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travelLogistics', showId] });
      setEditOpen(false);
      setEditingItem(null);
      setFormData(EMPTY_FORM);
      setActiveBankRecord(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.TravelLogistic.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['travelLogistics', showId] }),
  });

  const TRANSPORT_TYPES_SET = new Set(['trucking', 'freight', 'transport', 'general']);

  // Called when user selects a record from the Logistics Bank
  const handlePoolSelect = (bankRecord) => {
    setActiveBankRecord(bankRecord);
    setEditingItem(null);
    const isTransport = TRANSPORT_TYPES_SET.has(bankRecord.logistics_type);
    setFormData({
      ...EMPTY_FORM,
      logistics_type: bankRecord.logistics_type,
      description: bankRecord.description || bankRecord.name || '',
      vendor: bankRecord.vendor || '',
      // For transport: use base_address as origin, show delivery_address as destination
      origin: (isTransport && bankRecord.base_address) ? bankRecord.base_address : (bankRecord.origin || ''),
      destination: (isTransport && show?.delivery_address) ? show.delivery_address : (bankRecord.destination || ''),
      // Pre-fill mileage rates for transport
      mileage_rate: isTransport && bankRecord.rate_per_mile ? String(bankRecord.rate_per_mile) : '',
      billable_mileage_rate: isTransport && bankRecord.billable_rate_per_mile ? String(bankRecord.billable_rate_per_mile) : '',
      cost: bankRecord.default_cost ? String(bankRecord.default_cost) : '',
      billable_amount: bankRecord.default_billable_amount ? String(bankRecord.default_billable_amount) : '',
      bank_record_id: bankRecord.id,
      bank_record_name: bankRecord.name,
    });
    setEditOpen(true);
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setActiveBankRecord(null);
    setFormData({
      ...item,
      quantity: item.quantity || 1,
      unit_cost: item.unit_cost ?? item.cost ?? '',
      unit_billable: item.unit_billable ?? item.billable_amount ?? '',
      cost: item.cost || '',
      billable_amount: item.billable_amount || '',
    });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const totalCost = items.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
  const totalBillable = items.reduce((sum, item) => sum + (parseFloat(item.billable_amount) || 0), 0);
  const travelItems = items.filter(i => LOGISTICS_TYPES[i.logistics_type]?.category === 'travel');
  const transportItems = items.filter(i => LOGISTICS_TYPES[i.logistics_type]?.category === 'transport' || (!i.logistics_type || !LOGISTICS_TYPES[i.logistics_type]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Travel & Logistics</h2>
          <p className="text-sm text-muted-foreground">Travel = people movement · Transport = gear movement</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setActiveBankRecord(null); setEditingItem(null); setFormData({ ...EMPTY_FORM, logistics_type: 'crew_flight' }); setEditOpen(true); }}>
            <Plane className="w-4 h-4 mr-1" /> Travel
          </Button>
          <Button variant="outline" onClick={() => { setActiveBankRecord(null); setEditingItem(null); setFormData({ ...EMPTY_FORM, logistics_type: 'trucking' }); setEditOpen(true); }}>
            <Truck className="w-4 h-4 mr-1" /> Transport
          </Button>
          <Button onClick={() => setPoolOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> From Bank
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-1">No logistics planned yet</p>
            <p className="text-xs text-muted-foreground mb-4">Select from your saved Logistics Bank records</p>
            <Button size="sm" onClick={() => setPoolOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Browse Logistics Bank
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {travelItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-sm text-blue-400">Travel <span className="text-muted-foreground font-normal text-xs">(people movement)</span></h3>
              </div>
              {travelItems.map(item => (
                <LogisticsCard key={item.id} item={item} onEdit={handleEditClick} onDelete={deleteMutation.mutate} />
              ))}
            </div>
          )}
          {transportItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-orange-400" />
                <h3 className="font-semibold text-sm text-orange-400">Transport <span className="text-muted-foreground font-normal text-xs">(gear movement)</span></h3>
              </div>
              {transportItems.map(item => (
                <LogisticsCard key={item.id} item={item} onEdit={handleEditClick} onDelete={deleteMutation.mutate} />
              ))}
            </div>
          )}
          <Card className="border-border/50 bg-muted/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Total Logistics</span>
                <div className="text-right">
                  <p className="text-lg font-bold">${totalCost.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">cost</span></p>
                  {totalBillable > 0 && (
                    <p className="text-sm font-semibold text-primary">${totalBillable.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">billable</span></p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Step 1: Logistics Bank picker */}
      <LogisticsPoolSelector
        open={poolOpen}
        onOpenChange={setPoolOpen}
        onSelect={handlePoolSelect}
      />

      {/* Step 2: Project-specific field editor */}
      <LogisticsProjectEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        formData={formData}
        onChange={setFormData}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        isEditing={!!editingItem}
        bankRecord={activeBankRecord}
        show={show}
      />
    </div>
  );
}

function LogisticsCard({ item, onEdit, onDelete }) {
  const typeInfo = LOGISTICS_TYPES[item.logistics_type] || LOGISTICS_TYPES.general;
  const Icon = typeInfo.icon;

  return (
    <Card className="border-border/50">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3 flex-1">
            <Icon className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className="font-semibold text-sm">{item.description}</h4>
                {item.quantity > 1 && <span className="text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">×{item.quantity}</span>}
                <Badge className={cn('text-xs border', STATUS_COLORS[item.status] || STATUS_COLORS.pending)}>
                  {item.status}
                </Badge>
                <Badge variant="outline" className={cn('text-xs', typeInfo.color)}>
                  {typeInfo.label}
                </Badge>
              </div>
              {item.bank_record_name && (
                <p className="text-xs text-muted-foreground/60 mb-1">From: {item.bank_record_name}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                {item.assigned_person && <span>Person: {item.assigned_person}</span>}
                {item.vendor && <span>Vendor: {item.vendor}</span>}
                {item.origin && item.destination && <span>Route: {item.origin} → {item.destination}</span>}
                {item.pickup_datetime && !isNaN(new Date(item.pickup_datetime)) && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {format(new Date(item.pickup_datetime), 'MMM d, h:mm a')}
                  </span>
                )}
                {item.mileage > 0 && item.mileage_rate > 0 && (
                  <span>{item.mileage} mi × ${item.mileage_rate}/mi</span>
                )}
                {item.confirmation_number && <span>Ref: {item.confirmation_number}</span>}
              </div>
              {item.notes && <p className="text-xs text-muted-foreground mt-2 italic">"{item.notes}"</p>}
            </div>
          </div>
          <div className="flex items-start gap-1 shrink-0">
            <div className="text-right mr-1">
              {item.cost > 0 && <p className="font-semibold text-sm">${parseFloat(item.cost).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">cost</span></p>}
              {item.billable_amount > 0 && <p className="text-sm text-primary font-semibold">${parseFloat(item.billable_amount).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">bill</span></p>}
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(item)}>
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(item.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}