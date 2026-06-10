import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Phone, Mail, Star, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = {
  first_name: '', last_name: '', title: '', email: '', phone: '', phone_mobile: '',
  role: 'primary', is_primary: false, communication_preference: 'email',
  best_time_to_contact: '', service_preferences: '', notes: '', is_active: true,
};

const ROLE_COLORS = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  billing: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  technical: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  executive: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  venue: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  other: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

function ServicePrefsEditor({ value, onChange }) {
  const prefs = value ? value.split('\n').filter(Boolean) : [];
  const [input, setInput] = useState('');

  const addPref = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onChange([...prefs, trimmed].join('\n'));
    setInput('');
  };

  const removePref = (i) => {
    const updated = prefs.filter((_, idx) => idx !== i);
    onChange(updated.join('\n'));
  };

  return (
    <div className="space-y-2">
      {prefs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {prefs.map((pref, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2.5 py-1 rounded-md border border-border">
              {pref}
              <button type="button" onClick={() => removePref(i)} className="ml-0.5 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPref(); } }}
          placeholder="Type a preference and press Enter..."
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addPref} className="shrink-0">Add</Button>
      </div>
    </div>
  );
}

export default function ContactsPanel({ clientId, clientName }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', clientId],
    queryFn: () => db.entities.ClientContact.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...EMPTY, ...c }); setDialogOpen(true); };

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? db.entities.ClientContact.update(editing.id, data)
      : db.entities.ClientContact.create({ ...data, client_id: clientId, client_name: clientName }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts', clientId] }); setDialogOpen(false); toast.success('Contact saved'); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.ClientContact.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts', clientId] }),
  });

  const active = contacts.filter(c => c.is_active !== false);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" /> Add Contact</Button>
      </div>

      {active.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No contacts yet. Add the first contact for this client.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {active.map(c => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm">{c.first_name} {c.last_name}</p>
                      {c.is_primary && <Star className="w-3 h-3 text-amber-500" />}
                    </div>
                    {c.title && <p className="text-xs text-muted-foreground">{c.title}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
                <div className="space-y-1">
                  {c.email && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{c.email}</div>}
                  {(c.phone || c.phone_mobile) && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{c.phone || c.phone_mobile}</div>}
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <Badge variant="outline" className={`text-xs ${ROLE_COLORS[c.role] || ROLE_COLORS.other}`}>{c.role}</Badge>
                  <Badge variant="outline" className="text-xs">{c.communication_preference}</Badge>
                </div>
                {c.service_preferences && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.service_preferences.split('\n').filter(Boolean).map((pref, i) => (
                      <span key={i} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded border border-border">{pref}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Contact' : 'Add Contact'}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input value={form.first_name} onChange={e => set('first_name', e.target.value)} required /></div>
              <div><Label>Last Name *</Label><Input value={form.last_name} onChange={e => set('last_name', e.target.value)} required /></div>
              <div><Label>Title</Label><Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Event Director" /></div>
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => set('role', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['primary','billing','technical','executive','venue','other'].map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
              <div><Label>Mobile</Label><Input value={form.phone_mobile} onChange={e => set('phone_mobile', e.target.value)} /></div>
              <div>
                <Label>Communication Preference</Label>
                <Select value={form.communication_preference} onValueChange={v => set('communication_preference', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['email','phone','text','any'].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Best Time to Contact</Label><Input value={form.best_time_to_contact} onChange={e => set('best_time_to_contact', e.target.value)} placeholder="e.g. Weekdays 9–5 EST" /></div>
              <div className="col-span-2">
                <Label>Service Preferences</Label>
                <ServicePrefsEditor value={form.service_preferences} onChange={v => set('service_preferences', v)} />
              </div>
              <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} /></div>
            </div>
            <div className="flex items-center justify-between border rounded-lg px-3 py-2">
              <p className="text-sm font-medium">Primary Contact</p>
              <Switch checked={!!form.is_primary} onCheckedChange={v => set('is_primary', v)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save Contact'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}