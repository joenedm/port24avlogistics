import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plane, Hotel, Truck, MapPin, DollarSign, Phone, ArrowRight, Plus } from 'lucide-react';

const TYPE_CONFIG = {
  crew_flight:    { label: 'Crew Flight',           icon: Plane,      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',   category: 'travel' },
  crew_hotel:     { label: 'Hotel / Accommodation', icon: Hotel,      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', category: 'travel' },
  crew_rental_car:{ label: 'Rental Car (Crew)',     icon: Truck,      color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',   category: 'travel' },
  crew_rideshare: { label: 'Rideshare/Car Service', icon: Truck,      color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',   category: 'travel' },
  crew_mileage:   { label: 'Crew Mileage',          icon: MapPin,     color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', category: 'travel' },
  crew_perdiem:   { label: 'Per Diem',              icon: DollarSign, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', category: 'travel' },
  trucking:       { label: 'Trucking / Freight',    icon: Truck,      color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', category: 'transport' },
  freight:        { label: 'Freight Carrier',       icon: Truck,      color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', category: 'transport' },
  transport:      { label: 'Ground Transport / Van',icon: Truck,      color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', category: 'transport' },
  general:        { label: 'General Logistics',     icon: MapPin,     color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', category: 'transport' },
};

export default function LogisticsPoolSelector({ open, onOpenChange, onSelect }) {
  const [search, setSearch] = useState('');
  const [categoryTab, setCategoryTab] = useState('all'); // 'all' | 'travel' | 'transport'

  const { data: bankRecords = [] } = useQuery({
    queryKey: ['logisticsBank'],
    queryFn: () => base44.entities.LogisticsBank.list('-created_date'),
    enabled: open,
  });

  const filtered = useMemo(() => {
    return bankRecords.filter(r => {
      if (!r.is_active) return false;
      const cfg = TYPE_CONFIG[r.logistics_type];
      const matchCategory = categoryTab === 'all' || cfg?.category === categoryTab;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        r.name?.toLowerCase().includes(q) ||
        r.vendor?.toLowerCase().includes(q) ||
        r.contact_name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.origin?.toLowerCase().includes(q) ||
        r.destination?.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [bankRecords, search, categoryTab]);

  const handleSelect = (record) => {
    onSelect(record);
    onOpenChange(false);
    setSearch('');
    setCategoryTab('all');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-base font-semibold">Logistics Bank</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select a saved logistics record from Admin Settings to add to this project.
          </p>
        </DialogHeader>

        {/* Category Tabs + Search */}
        <div className="px-6 py-3 border-b border-border space-y-2">
          <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
            {[
              { key: 'all', label: 'All' },
              { key: 'travel', label: 'Travel (People)' },
              { key: 'transport', label: 'Transport (Gear)' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setCategoryTab(tab.key)}
                className={`flex-1 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${categoryTab === tab.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, vendor, route..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Records list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {bankRecords.filter(r => r.is_active).length === 0
                ? 'No logistics records in Admin Settings yet. Add records in Admin > Logistics first.'
                : 'No records match your search.'}
            </div>
          ) : (
            filtered.map(record => {
              const cfg = TYPE_CONFIG[record.logistics_type] || TYPE_CONFIG.general;
              const Icon = cfg.icon;
              return (
                <button
                  key={record.id}
                  onClick={() => handleSelect(record)}
                  className="w-full text-left group"
                >
                  <Card className="border-border/60 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer">
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-1.5 rounded-md bg-muted/40">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Name + type badge */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-sm">{record.name}</span>
                            <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                              {cfg.label}
                            </Badge>
                          </div>

                          {/* Metadata row */}
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                            {record.vendor && <span>{record.vendor}</span>}
                            {record.contact_name && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />{record.contact_name}
                              </span>
                            )}
                            {record.origin && record.destination && (
                              <span className="flex items-center gap-1">
                                {record.origin} <ArrowRight className="w-3 h-3" /> {record.destination}
                              </span>
                            )}
                            {record.vehicle_type && <span>{record.vehicle_type}</span>}
                            {record.default_cost > 0 && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />${record.default_cost}
                              </span>
                            )}
                          </div>

                          {record.description && (
                            <p className="text-xs text-muted-foreground/70 mt-1 italic truncate">{record.description}</p>
                          )}
                        </div>

                        {/* Add arrow */}
                        <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <Plus className="w-3.5 h-3.5 text-primary" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}