import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Star, AlertTriangle, Users, MapPin, StickyNote, Paperclip, History, Settings2, Plus, Pencil, ChevronLeft } from 'lucide-react';
import ClientFormDialog from '@/components/crm/ClientFormDialog';
import ContactsPanel from '@/components/crm/ContactsPanel';
import ClientNotesPanel from '@/components/crm/ClientNotesPanel';
import ClientFilesPanel from '@/components/crm/ClientFilesPanel';
import ClientPreferencesPanel from '@/components/crm/ClientPreferencesPanel';
import ClientAlertsBar from '@/components/crm/ClientAlertsBar';
import BackButton from '@/components/shared/BackButton';

const STATUS_COLORS = {
  active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  inactive: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  prospect: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  vip: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

export default function ClientDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => db.entities.Client.filter({ id }).then(r => r[0]),
  });

  const { data: shows = [] } = useQuery({
    queryKey: ['shows-for-client', id],
    queryFn: () => db.entities.Show.filter({ client_id: id }),
    enabled: !!id,
  });

  if (isLoading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-4 rounded-full animate-spin border-border border-t-primary" /></div>;
  if (!client) return <div className="text-center py-24 text-muted-foreground">Client not found</div>;

  return (
    <div>
      <BackButton to="/clients" label="Back to Clients" />

      <div className="flex items-start justify-between gap-4 mb-4 mt-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{client.company_name}</h1>
              {client.status === 'vip' && <Star className="w-5 h-5 text-amber-500" />}
            </div>
            {client.display_name && client.display_name !== client.company_name && (
              <p className="text-sm text-muted-foreground">{client.display_name}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Badge variant="outline" className={STATUS_COLORS[client.status] || STATUS_COLORS.active}>{client.status || 'active'}</Badge>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
        </div>
      </div>

      <ClientAlertsBar client={client} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Contacts</TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1.5"><Settings2 className="w-3.5 h-3.5" /> Preferences</TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5"><StickyNote className="w-3.5 h-3.5" /> Notes</TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Files</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><History className="w-3.5 h-3.5" /> Project History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Billing & Payment</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Payment Terms" value={client.payment_terms_custom || client.payment_terms?.replace(/_/g,' ')} />
                <Row label="Billing Email" value={client.billing_email} />
                <Row label="Billing Contact" value={client.billing_contact_name} />
                <Row label="Tax Exempt" value={client.tax_exempt ? 'Yes' : 'No'} />
                {client.tax_id && <Row label="Tax ID" value={client.tax_id} />}
                {client.billing_address && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Billing Address</p>
                    <p>{client.billing_address}</p>
                    <p>{[client.billing_city, client.billing_state, client.billing_zip].filter(Boolean).join(', ')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Requirements & Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="PO Required" value={client.po_required ? '⚠ Yes' : 'No'} highlight={client.po_required} />
                {client.po_notes && <Row label="PO Notes" value={client.po_notes} />}
                <Row label="COI Required" value={client.coi_required ? '⚠ Yes' : 'No'} highlight={client.coi_required} />
                {client.coi_notes && <Row label="COI Notes" value={client.coi_notes} />}
                {client.coi_holder_name && <Row label="COI Holder" value={client.coi_holder_name} />}
                <Row label="Quote Format" value={client.quote_format?.replace(/_/g,' ')} />
                <Row label="Invoice Delivery" value={client.invoice_delivery} />
                <Row label="Communication" value={client.preferred_communication} />
              </CardContent>
            </Card>

            {(client.internal_notes || client.general_notes) && (
              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {client.general_notes && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">General Notes</p>
                      <p className="text-sm whitespace-pre-wrap">{client.general_notes}</p>
                    </div>
                  )}
                  {client.internal_notes && (
                    <div className="border border-amber-500/20 rounded-lg p-3 bg-amber-500/5">
                      <p className="text-xs font-medium text-amber-600 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Internal Notes (not visible to client)</p>
                      <p className="text-sm whitespace-pre-wrap">{client.internal_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-base">Stats</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Total Shows" value={shows.length} />
                <Row label="Total Revenue" value={client.total_revenue ? `$${client.total_revenue.toLocaleString()}` : '—'} />
                <Row label="First Show" value={client.first_show_date} />
                <Row label="Last Show" value={client.last_show_date} />
                {client.website && <Row label="Website" value={<a href={client.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{client.website}</a>} />}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts">
          <ContactsPanel clientId={id} clientName={client.company_name} />
        </TabsContent>

        <TabsContent value="preferences">
          <ClientPreferencesPanel clientId={id} clientName={client.company_name} />
        </TabsContent>

        <TabsContent value="notes">
          <ClientNotesPanel clientId={id} clientName={client.company_name} showId={null} />
        </TabsContent>

        <TabsContent value="files">
          <ClientFilesPanel clientId={id} clientName={client.company_name} />
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-3">
            {shows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p>No projects yet for this client</p>
              </div>
            ) : (
              shows.sort((a, b) => new Date(b.start_date) - new Date(a.start_date)).map(show => (
                <Link key={show.id} to={`/shows/${show.id}`}>
                  <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{show.name}</p>
                        <p className="text-xs text-muted-foreground">{show.start_date}{show.venue_name ? ` · ${show.venue_name}` : ''}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        {show.total_value && <span className="text-sm font-medium">${show.total_value.toLocaleString()}</span>}
                        <Badge variant="outline" className="text-xs capitalize">{show.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} onSaved={() => queryClient.invalidateQueries({ queryKey: ['client', id] })} />
    </div>
  );
}

function Row({ label, value, highlight }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium text-right ${highlight ? 'text-orange-500' : ''}`}>{value}</span>
    </div>
  );
}