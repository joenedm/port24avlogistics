import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_COLORS = {
  production: 'bg-primary/10 text-primary',
  billing: 'bg-emerald-500/10 text-emerald-600',
  quote_layout: 'bg-blue-500/10 text-blue-600',
  crew: 'bg-purple-500/10 text-purple-600',
  venue_logistics: 'bg-orange-500/10 text-orange-600',
  equipment: 'bg-amber-500/10 text-amber-600',
  show_style: 'bg-teal-500/10 text-teal-600',
};

const EMPTY = {
  name: '', preference_type: 'production', is_active: true,
  production_notes: '', preferred_start_time: '', preferred_end_time: '',
  setup_lead_time_hours: '', strike_time_hours: '',
  billing_notes: '', preferred_payment_terms: '', invoice_delivery_preference: '',
  quote_layout_notes: '', preferred_quote_format: '', include_crew_on_quote: false, include_travel_on_quote: true,
  crew_preferences: '', preferred_crew_size: '', crew_dress_code: '',
  venue_logistics_notes: '', preferred_load_in_time: '', requires_union: false,
  equipment_notes: '', preferred_brands: '', avoid_equipment: '',
  preferred_audio_setup: '', preferred_video_setup: '', preferred_lighting_setup: '',
  show_style_notes: '', atmosphere_preferences: '', music_preferences: '', branding_notes: '',
};

export default function ClientPreferencesPanel({ clientId, clientName }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: prefs = [] } = useQuery({
    queryKey: ['client-prefs', clientId],
    queryFn: () => db.entities.ClientPreference.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...EMPTY, ...p }); setDialogOpen(true); };

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? db.entities.ClientPreference.update(editing.id, data)
      : db.entities.ClientPreference.create({ ...data, client_id: clientId, client_name: clientName }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['client-prefs', clientId] }); setDialogOpen(false); toast.success('Preference saved'); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.ClientPreference.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-prefs', clientId] }),
  });

  const active = prefs.filter(p => p.is_active !== false);

  const getTypeFields = (type, p) => {
    switch (type) {
      case 'production': return [p.production_notes, p.preferred_start_time && `Start: ${p.preferred_start_time}`, p.setup_lead_time_hours && `Lead time: ${p.setup_lead_time_hours}h`].filter(Boolean);
      case 'billing': return [p.billing_notes, p.preferred_payment_terms].filter(Boolean);
      case 'quote_layout': return [p.quote_layout_notes, p.preferred_quote_format && `Format: ${p.preferred_quote_format}`].filter(Boolean);
      case 'crew': return [p.crew_preferences, p.crew_dress_code && `Dress: ${p.crew_dress_code}`, p.preferred_crew_size && `Size: ${p.preferred_crew_size}`].filter(Boolean);
      case 'venue_logistics': return [p.venue_logistics_notes, p.preferred_load_in_time && `Load-in: ${p.preferred_load_in_time}`, p.requires_union ? 'Union required' : null].filter(Boolean);
      case 'equipment': return [p.equipment_notes, p.preferred_brands && `Preferred: ${p.preferred_brands}`, p.avoid_equipment && `Avoid: ${p.avoid_equipment}`].filter(Boolean);
      case 'show_style': return [p.show_style_notes, p.atmosphere_preferences, p.music_preferences].filter(Boolean);
      default: return [];
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" /> Add Preference Set</Button>
      </div>

      {active.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Settings2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p>No saved preferences yet.</p>
          <p className="text-sm mt-1">Save common preferences to auto-populate future projects.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {active.map(pref => {
            const details = getTypeFields(pref.preference_type, pref);
            return (
              <Card key={pref.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{pref.name}</p>
                      <Badge variant="outline" className={`text-xs mt-1 ${TYPE_COLORS[pref.preference_type] || ''}`}>
                        {pref.preference_type?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(pref)}><Pencil className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(pref.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  {details.length > 0 && (
                    <ul className="text-xs text-muted-foreground space-y-0.5 mt-2">
                      {details.slice(0, 3).map((d, i) => <li key={i} className="truncate">· {d}</li>)}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Preference' : 'Add Preference Set'}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); if (!form.name.trim()) return; saveMutation.mutate(form); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Name *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Annual Conference Standard" required /></div>
              <div className="col-span-2">
                <Label>Type</Label>
                <Select value={form.preference_type} onValueChange={v => set('preference_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(TYPE_COLORS).map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g,' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.preference_type === 'production' && (
              <div className="space-y-2">
                <div><Label>Production Notes</Label><Textarea value={form.production_notes} onChange={e => set('production_notes', e.target.value)} rows={2} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Preferred Start Time</Label><Input value={form.preferred_start_time} onChange={e => set('preferred_start_time', e.target.value)} placeholder="e.g. 8:00 AM" /></div>
                  <div><Label>Preferred End Time</Label><Input value={form.preferred_end_time} onChange={e => set('preferred_end_time', e.target.value)} /></div>
                  <div><Label>Setup Lead Time (hrs)</Label><Input type="number" value={form.setup_lead_time_hours} onChange={e => set('setup_lead_time_hours', e.target.value)} /></div>
                  <div><Label>Strike Time (hrs)</Label><Input type="number" value={form.strike_time_hours} onChange={e => set('strike_time_hours', e.target.value)} /></div>
                </div>
              </div>
            )}

            {form.preference_type === 'billing' && (
              <div className="space-y-2">
                <div><Label>Billing Notes</Label><Textarea value={form.billing_notes} onChange={e => set('billing_notes', e.target.value)} rows={2} /></div>
                <div><Label>Preferred Payment Terms</Label><Input value={form.preferred_payment_terms} onChange={e => set('preferred_payment_terms', e.target.value)} /></div>
                <div><Label>Invoice Delivery Preference</Label><Input value={form.invoice_delivery_preference} onChange={e => set('invoice_delivery_preference', e.target.value)} /></div>
              </div>
            )}

            {form.preference_type === 'quote_layout' && (
              <div className="space-y-2">
                <div><Label>Quote Layout Notes</Label><Textarea value={form.quote_layout_notes} onChange={e => set('quote_layout_notes', e.target.value)} rows={2} /></div>
                <div>
                  <Label>Preferred Format</Label>
                  <Select value={form.preferred_quote_format} onValueChange={v => set('preferred_quote_format', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {['detailed','summary','rooms_only','single_page'].map(f => <SelectItem key={f} value={f} className="capitalize">{f.replace(/_/g,' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between border rounded-lg px-3 py-2">
                  <p className="text-sm">Include Crew on Quote</p>
                  <Switch checked={!!form.include_crew_on_quote} onCheckedChange={v => set('include_crew_on_quote', v)} />
                </div>
                <div className="flex items-center justify-between border rounded-lg px-3 py-2">
                  <p className="text-sm">Include Travel on Quote</p>
                  <Switch checked={!!form.include_travel_on_quote} onCheckedChange={v => set('include_travel_on_quote', v)} />
                </div>
              </div>
            )}

            {form.preference_type === 'crew' && (
              <div className="space-y-2">
                <div><Label>Crew Preferences</Label><Textarea value={form.crew_preferences} onChange={e => set('crew_preferences', e.target.value)} rows={2} placeholder="Specific requests, certifications, etc." /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Preferred Crew Size</Label><Input type="number" value={form.preferred_crew_size} onChange={e => set('preferred_crew_size', e.target.value)} /></div>
                  <div><Label>Dress Code</Label><Input value={form.crew_dress_code} onChange={e => set('crew_dress_code', e.target.value)} placeholder="e.g. All black" /></div>
                </div>
              </div>
            )}

            {form.preference_type === 'venue_logistics' && (
              <div className="space-y-2">
                <div><Label>Venue Logistics Notes</Label><Textarea value={form.venue_logistics_notes} onChange={e => set('venue_logistics_notes', e.target.value)} rows={2} /></div>
                <div><Label>Preferred Load-in Time</Label><Input value={form.preferred_load_in_time} onChange={e => set('preferred_load_in_time', e.target.value)} /></div>
                <div className="flex items-center justify-between border rounded-lg px-3 py-2">
                  <p className="text-sm">Requires Union Crew</p>
                  <Switch checked={!!form.requires_union} onCheckedChange={v => set('requires_union', v)} />
                </div>
              </div>
            )}

            {form.preference_type === 'equipment' && (
              <div className="space-y-2">
                <div><Label>Equipment Notes</Label><Textarea value={form.equipment_notes} onChange={e => set('equipment_notes', e.target.value)} rows={2} /></div>
                <div><Label>Preferred Brands</Label><Input value={form.preferred_brands} onChange={e => set('preferred_brands', e.target.value)} /></div>
                <div><Label>Equipment to Avoid</Label><Input value={form.avoid_equipment} onChange={e => set('avoid_equipment', e.target.value)} /></div>
                <div><Label>Preferred Audio Setup</Label><Input value={form.preferred_audio_setup} onChange={e => set('preferred_audio_setup', e.target.value)} /></div>
                <div><Label>Preferred Video Setup</Label><Input value={form.preferred_video_setup} onChange={e => set('preferred_video_setup', e.target.value)} /></div>
                <div><Label>Preferred Lighting Setup</Label><Input value={form.preferred_lighting_setup} onChange={e => set('preferred_lighting_setup', e.target.value)} /></div>
              </div>
            )}

            {form.preference_type === 'show_style' && (
              <div className="space-y-2">
                <div><Label>Show Style Notes</Label><Textarea value={form.show_style_notes} onChange={e => set('show_style_notes', e.target.value)} rows={2} /></div>
                <div><Label>Atmosphere Preferences</Label><Input value={form.atmosphere_preferences} onChange={e => set('atmosphere_preferences', e.target.value)} /></div>
                <div><Label>Music Preferences</Label><Input value={form.music_preferences} onChange={e => set('music_preferences', e.target.value)} /></div>
                <div><Label>Branding Notes</Label><Textarea value={form.branding_notes} onChange={e => set('branding_notes', e.target.value)} rows={2} /></div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>Save Preference</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}