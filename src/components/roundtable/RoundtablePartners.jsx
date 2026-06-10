import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Plus, Pencil, Trash2, Building2, Phone, Mail, MapPin, Package, Upload, Handshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import PartnerFormDialog from './PartnerFormDialog';
import RoundtableBulkImport from './RoundtableBulkImport';

export default function RoundtablePartners() {
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [bulkImportPartnerId, setBulkImportPartnerId] = useState(null);
  const qc = useQueryClient();

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['roundtable_partners'],
    queryFn: () => db.entities.RoundtablePartner.list('-created_date', 100),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['roundtable_items'],
    queryFn: () => db.entities.RoundtableItem.list('-created_date', 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.RoundtablePartner.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roundtable_partners'] }); toast.success('Partner removed'); },
  });

  const itemCountByPartner = (partnerId) => items.filter(i => i.partner_id === partnerId).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{partners.length} trusted partner{partners.length !== 1 ? 's' : ''}</p>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Add Partner
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>}

      {!isLoading && partners.length === 0 && (
        <Card className="p-12 text-center">
          <Handshake className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold mb-1">No partners yet</p>
          <p className="text-sm text-muted-foreground">Add your first trusted partner company to start building your Roundtable.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {partners.map(partner => (
          <Card key={partner.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {partner.logo_url
                    ? <img src={partner.logo_url} alt="" className="w-10 h-10 rounded-lg object-contain bg-muted p-1" />
                    : <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Building2 className="w-5 h-5 text-primary" /></div>
                  }
                  <div className="min-w-0">
                    <CardTitle className="text-sm truncate">{partner.company_name}</CardTitle>
                    {partner.contact_name && <p className="text-xs text-muted-foreground">{partner.contact_name}</p>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => { setEditing(partner); setShowForm(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(partner.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {partner.email && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="w-3 h-3 shrink-0" />{partner.email}
                </div>
              )}
              {partner.phone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="w-3 h-3 shrink-0" />{partner.phone}
                </div>
              )}
              {partner.pickup_address && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 shrink-0 mt-0.5" /><span className="leading-relaxed">{partner.pickup_address}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Package className="w-3 h-3" />
                  <span>{itemCountByPartner(partner.id)} item{itemCountByPartner(partner.id) !== 1 ? 's' : ''} in inventory</span>
                </div>
                {partner.preferred_categories && (
                  <div className="flex flex-wrap gap-1 justify-end">
                    {partner.preferred_categories.split(',').slice(0, 2).map(c => (
                      <Badge key={c} variant="outline" className="text-xs px-1.5 py-0">{c.trim()}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 mt-1 text-xs h-7"
                onClick={() => setBulkImportPartnerId(partner.id)}
              >
                <Upload className="w-3 h-3" /> Bulk Upload Inventory
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && (
        <PartnerFormDialog
          partner={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['roundtable_partners'] }); setShowForm(false); setEditing(null); }}
        />
      )}

      {bulkImportPartnerId && (
        <RoundtableBulkImport
          partners={partners}
          defaultPartnerId={bulkImportPartnerId}
          onClose={() => setBulkImportPartnerId(null)}
          onDone={() => { qc.invalidateQueries({ queryKey: ['roundtable_items'] }); setBulkImportPartnerId(null); }}
        />
      )}
    </div>
  );
}