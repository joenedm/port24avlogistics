import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pin, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';

const TYPE_COLORS = {
  general: 'bg-slate-500/10 text-slate-500',
  billing: 'bg-emerald-500/10 text-emerald-600',
  technical: 'bg-blue-500/10 text-blue-600',
  service: 'bg-primary/10 text-primary',
  follow_up: 'bg-amber-500/10 text-amber-600',
  complaint: 'bg-red-500/10 text-red-600',
  compliment: 'bg-emerald-500/10 text-emerald-600',
};

const EMPTY = { title: '', content: '', visibility: 'internal', note_type: 'general' };

export default function ClientNotesPanel({ clientId, clientName, showId }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [visFilter, setVisFilter] = useState('all');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const qKey = ['client-notes', clientId, showId];
  const { data: notes = [] } = useQuery({
    queryKey: qKey,
    queryFn: () => {
      const q = { client_id: clientId };
      if (showId) q.show_id = showId;
      return db.entities.ClientNote.filter(q);
    },
    enabled: !!clientId,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => db.entities.ClientNote.create({
      ...data, client_id: clientId, client_name: clientName,
      show_id: showId || undefined, show_name: undefined,
      author_name: user?.full_name || user?.email,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qKey }); setDialogOpen(false); setForm(EMPTY); toast.success('Note saved'); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.ClientNote.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }) => db.entities.ClientNote.update(id, { pinned: !pinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  const filtered = notes
    .filter(n => visFilter === 'all' || n.visibility === visFilter)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.created_date) - new Date(a.created_date));

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex gap-2">
          {['all','internal','client_visible'].map(v => (
            <Button key={v} size="sm" variant={visFilter === v ? 'default' : 'outline'} onClick={() => setVisFilter(v)} className="text-xs h-8">
              {v === 'all' ? 'All' : v === 'internal' ? 'Internal' : 'Client-Visible'}
            </Button>
          ))}
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setForm(EMPTY); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" /> Add Note
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><p>No notes yet.</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(note => (
            <Card key={note.id} className={note.pinned ? 'border-primary/30' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {note.pinned && <Pin className="w-3 h-3 text-primary shrink-0" />}
                      {note.title && <p className="font-medium text-sm">{note.title}</p>}
                      <Badge variant="outline" className={`text-xs ${TYPE_COLORS[note.note_type] || ''}`}>{note.note_type}</Badge>
                      {note.visibility === 'internal' ? (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1"><EyeOff className="w-2.5 h-2.5" /> Internal</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 gap-1"><Eye className="w-2.5 h-2.5" /> Client-Visible</Badge>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {note.author_name && `${note.author_name} · `}{note.created_date && format(new Date(note.created_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => pinMutation.mutate({ id: note.id, pinned: note.pinned })}>
                      <Pin className={`w-3 h-3 ${note.pinned ? 'text-primary' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(note.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Note</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); if (!form.content.trim()) return; saveMutation.mutate(form); }} className="space-y-3">
            <div><Label>Title (optional)</Label><Input value={form.title} onChange={e => set('title', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.note_type} onValueChange={v => set('note_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['general','billing','technical','service','follow_up','complaint','compliment'].map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g,' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Visibility</Label>
                <Select value={form.visibility} onValueChange={v => set('visibility', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal Only</SelectItem>
                    <SelectItem value="client_visible">Client-Visible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Note *</Label><Textarea value={form.content} onChange={e => set('content', e.target.value)} rows={4} required /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>Save Note</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}