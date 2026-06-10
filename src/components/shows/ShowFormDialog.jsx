import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/api/db';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Plus, Building2, MapPin, User, ChevronDown, X, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import ClientFormDialog from '@/components/crm/ClientFormDialog';
import VenueFormDialog from '@/components/crm/VenueFormDialog';
import { toast } from 'sonner';

// ── Inline Create Contact Form ─────────────────────────────────────────────────
function CreateContactInline({ clientId, onCreated, onCancel }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ first_name: '', last_name: '', title: '', email: '', phone: '', phone_mobile: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => db.entities.ClientContact.create({ ...form, client_id: clientId, role: 'primary' }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['clientContacts', clientId] });
      toast.success('Contact created');
      onCreated(created);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mt-2 p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
      <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" /> New Contact</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">First Name *</Label>
          <Input className="h-8 text-sm" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Last Name *</Label>
          <Input className="h-8 text-sm" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Title</Label>
          <Input className="h-8 text-sm" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Event Manager" />
        </div>
        <div>
          <Label className="text-xs">Phone</Label>
          <Input className="h-8 text-sm" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Email</Label>
          <Input className="h-8 text-sm" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
        <Button type="button" size="sm" className="h-7 text-xs" disabled={!form.first_name || !form.last_name || mutation.isPending}
          onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Saving…' : 'Save Contact'}
        </Button>
      </div>
    </div>
  );
}

// ── Inline searchable selector ────────────────────────────────────────────────
function InlineSelector({ label, icon: Icon, value, displayValue, placeholder, options, onSelect, onClear, onCreateNew, createLabel }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <Label className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
        {label}
      </Label>
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-primary/40 bg-primary/5">
          <span className="flex-1 text-sm font-medium truncate">{displayValue}</span>
          <button type="button" onClick={onClear} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setOpen(true); setSearch(''); }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-input bg-transparent text-sm hover:bg-muted/30 transition-colors text-left"
        >
          <span className="text-muted-foreground">{placeholder}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <Input
              autoFocus
              placeholder={`Search ${label.toLowerCase()}…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No results</p>
            ) : (
              filtered.map(o => (
                <button
                  key={o.value}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
                  onClick={() => { onSelect(o); setOpen(false); setSearch(''); }}
                >
                  <p className="font-medium">{o.label}</p>
                  {o.sub && <p className="text-xs text-muted-foreground">{o.sub}</p>}
                </button>
              ))
            )}
          </div>
          <div className="border-t border-border p-1.5">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-md transition-colors"
              onClick={() => { setOpen(false); onCreateNew(); }}
            >
              <Plus className="w-3.5 h-3.5" /> {createLabel}
            </button>
          </div>
        </div>
      )}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}

// ── Main Dialog ───────────────────────────────────────────────────────────────
export default function ShowFormDialog({ open, onOpenChange, show }) {
  const isEditing = !!show;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '', client: '', client_id: '', venue: '', venue_id: '', venue_name: '',
    delivery_address: '', status: 'planning',
    start_date: '', end_date: '', load_out_date: '', return_date: '',
    notes: '', contact_name: '', contact_phone: '', contact_email: '',
    client_contact_id: '', client_contact_name: '',
  });

  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);
  const [newClientId, setNewClientId] = useState(null);
  const [newVenueId, setNewVenueId] = useState(null);
  const [creatingContact, setCreatingContact] = useState(false);

  // Fetch CRM data
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('-created_date', 500),
    enabled: open,
  });
  const { data: venues = [] } = useQuery({
    queryKey: ['venues'],
    queryFn: () => db.entities.Venue.list('-created_date', 500),
    enabled: open,
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts', formData.client_id],
    queryFn: () => db.entities.ClientContact.filter({ client_id: formData.client_id }),
    enabled: !!formData.client_id,
  });

  useEffect(() => {
    if (show) {
      setFormData({
        name: show.name || '', client: show.client || '', client_id: show.client_id || '',
        venue: show.venue || '', venue_id: show.venue_id || '', venue_name: show.venue_name || '',
        delivery_address: show.delivery_address || '',
        status: show.status || 'planning', start_date: show.start_date || '',
        end_date: show.end_date || '', load_out_date: show.load_out_date || '',
        return_date: show.return_date || '', notes: show.notes || '',
        contact_name: show.contact_name || '', contact_phone: show.contact_phone || '',
        contact_email: show.contact_email || '',
        client_contact_id: show.client_contact_id || '',
        client_contact_name: show.client_contact_name || '',
      });
    } else {
      setFormData({
        name: '', client: '', client_id: '', venue: '', venue_id: '', venue_name: '',
        delivery_address: '', status: 'planning',
        start_date: '', end_date: '', load_out_date: '', return_date: '',
        notes: '', contact_name: '', contact_phone: '', contact_email: '',
        client_contact_id: '', client_contact_name: '',
      });
    }
  }, [show, open]);

  // After a new client is created, auto-select it
  useEffect(() => {
    if (!newClientId || clients.length === 0) return;
    const c = clients.find(x => x.id === newClientId);
    if (c) { handleSelectClient({ value: c.id, label: c.display_name || c.company_name, raw: c }); setNewClientId(null); }
  }, [clients, newClientId]);

  // After a new venue is created, auto-select it
  useEffect(() => {
    if (!newVenueId || venues.length === 0) return;
    const v = venues.find(x => x.id === newVenueId);
    if (v) { handleSelectVenue({ value: v.id, label: v.name, raw: v }); setNewVenueId(null); }
  }, [venues, newVenueId]);

  const mutation = useMutation({
    mutationFn: (data) => isEditing ? db.entities.Show.update(show.id, data) : db.entities.Show.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows'] });
      onOpenChange(false);
    },
  });

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSelectClient = (option) => {
    const c = option.raw;
    setFormData(prev => ({
      ...prev,
      client_id: c.id,
      client: c.display_name || c.company_name,
      // Reset contact when client changes
      client_contact_id: '',
      client_contact_name: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
    }));
  };

  const handleClearClient = () => {
    setFormData(prev => ({
      ...prev,
      client_id: '', client: '',
      client_contact_id: '', client_contact_name: '',
      contact_name: '', contact_phone: '', contact_email: '',
    }));
    setCreatingContact(false);
  };

  const handleSelectContact = (option) => {
    const c = option.raw;
    setFormData(prev => ({
      ...prev,
      client_contact_id: c.id,
      client_contact_name: `${c.first_name} ${c.last_name}`,
      contact_name: `${c.first_name} ${c.last_name}`,
      contact_phone: c.phone || c.phone_mobile || prev.contact_phone,
      contact_email: c.email || prev.contact_email,
    }));
  };

  const handleSelectVenue = (option) => {
    const v = option.raw;
    const addr = [v.address, v.city, v.state, v.zip].filter(Boolean).join(', ');
    setFormData(prev => ({
      ...prev,
      venue_id: v.id,
      venue_name: v.name,
      venue: v.name,
      delivery_address: addr || prev.delivery_address,
    }));
  };

  const handleClearVenue = () => {
    setFormData(prev => ({ ...prev, venue_id: '', venue_name: '', venue: '' }));
  };

  const clientOptions = clients.map(c => ({
    value: c.id,
    label: c.display_name || c.company_name,
    sub: c.industry || '',
    raw: c,
  }));

  const contactOptions = contacts.map(c => ({
    value: c.id,
    label: `${c.first_name} ${c.last_name}`,
    sub: c.title || c.email || '',
    raw: c,
  }));

  const venueOptions = venues.map(v => ({
    value: v.id,
    label: v.name,
    sub: [v.city, v.state].filter(Boolean).join(', '),
    raw: v,
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Show' : 'Create New Show'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Show Name */}
              <div className="col-span-2">
                <Label>Show Name *</Label>
                <Input value={formData.name} onChange={e => set('name', e.target.value)} required />
              </div>

              {/* Client selector */}
              <div className="col-span-2">
                <InlineSelector
                  label="Client"
                  icon={Building2}
                  value={formData.client_id}
                  displayValue={formData.client}
                  placeholder="Select or search client…"
                  options={clientOptions}
                  onSelect={handleSelectClient}
                  onClear={handleClearClient}
                  onCreateNew={() => setClientDialogOpen(true)}
                  createLabel="Create new client"
                />
              </div>

              {/* Point of Contact — only shown when client is selected */}
              {formData.client_id && (
                <div className="col-span-2">
                  {!creatingContact && (
                    <InlineSelector
                      label="Point of Contact"
                      icon={User}
                      value={formData.client_contact_id}
                      displayValue={formData.contact_name}
                      placeholder="Select contact for this show…"
                      options={contactOptions}
                      onSelect={(opt) => { handleSelectContact(opt); setCreatingContact(false); }}
                      onClear={() => setFormData(prev => ({
                        ...prev,
                        client_contact_id: '', client_contact_name: '',
                        contact_name: '', contact_phone: '', contact_email: '',
                      }))}
                      onCreateNew={() => setCreatingContact(true)}
                      createLabel="Add new contact"
                    />
                  )}
                  {creatingContact && (
                    <CreateContactInline
                      clientId={formData.client_id}
                      onCreated={(c) => {
                        handleSelectContact({ raw: c });
                        setCreatingContact(false);
                      }}
                      onCancel={() => setCreatingContact(false)}
                    />
                  )}
                  {formData.client_contact_id && !creatingContact && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Phone</Label>
                        <Input className="h-8 text-xs" value={formData.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="Phone" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <Input className="h-8 text-xs" value={formData.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="Email" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual contact fallback when no client selected */}
              {!formData.client_id && (
                <>
                  <div>
                    <Label>Contact Name</Label>
                    <Input value={formData.contact_name} onChange={e => set('contact_name', e.target.value)} />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input value={formData.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label>Contact Email</Label>
                    <Input type="email" value={formData.contact_email} onChange={e => set('contact_email', e.target.value)} />
                  </div>
                </>
              )}

              {/* Venue selector */}
              <div className="col-span-2">
                <InlineSelector
                  label="Venue"
                  icon={MapPin}
                  value={formData.venue_id}
                  displayValue={formData.venue}
                  placeholder="Select or search venue…"
                  options={venueOptions}
                  onSelect={handleSelectVenue}
                  onClear={handleClearVenue}
                  onCreateNew={() => setVenueDialogOpen(true)}
                  createLabel="Create new venue"
                />
              </div>

              {/* Delivery Address */}
              <div className="col-span-2">
                <Label>Delivery / Project Address</Label>
                <Input
                  value={formData.delivery_address}
                  onChange={e => set('delivery_address', e.target.value)}
                  placeholder="Street address, city, state — where gear is being delivered"
                />
              </div>

              {/* Status */}
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="picking">Picking</SelectItem>
                    <SelectItem value="on_truck">On Truck</SelectItem>
                    <SelectItem value="on_location">On Location</SelectItem>
                    <SelectItem value="returning">Returning</SelectItem>
                    <SelectItem value="finished">Finished</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div>
                <Label>Start Date *</Label>
                <input type="date" value={formData.start_date} onChange={e => set('start_date', e.target.value)} required className="w-full px-3 py-2 rounded-md border border-input bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" />
              </div>
              <div>
                <Label>End Date</Label>
                <input type="date" value={formData.end_date} onChange={e => set('end_date', e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" />
              </div>
              <div>
                <Label>Load Out Date</Label>
                <input type="date" value={formData.load_out_date} onChange={e => set('load_out_date', e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" />
              </div>
              <div>
                <Label>Return Date</Label>
                <input type="date" value={formData.return_date} onChange={e => set('return_date', e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={e => set('notes', e.target.value)} rows={3} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : isEditing ? 'Update Show' : 'Create Show'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Nested: Create Client */}
      <ClientFormDialog
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
        client={null}
        onSaved={async () => {
          // Refetch clients then auto-select the newest one
          await queryClient.invalidateQueries({ queryKey: ['clients'] });
          const refreshed = await db.entities.Client.list('-created_date', 1);
          if (refreshed[0]) {
            handleSelectClient({ value: refreshed[0].id, label: refreshed[0].display_name || refreshed[0].company_name, raw: refreshed[0] });
          }
        }}
      />

      {/* Nested: Create Venue */}
      <VenueFormDialog
        open={venueDialogOpen}
        onOpenChange={setVenueDialogOpen}
        venue={null}
        onSaved={async () => {
          await queryClient.invalidateQueries({ queryKey: ['venues'] });
          const refreshed = await db.entities.Venue.list('-created_date', 1);
          if (refreshed[0]) {
            handleSelectVenue({ value: refreshed[0].id, label: refreshed[0].name, raw: refreshed[0] });
          }
        }}
      />
    </>
  );
}