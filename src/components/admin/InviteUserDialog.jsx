import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { canAddUser } from '@/lib/planLimits';
import { UserPlus, Copy, Check, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const ROLE_LABELS = { admin: 'Admin', director: 'Director', manager: 'Manager', coordinator: 'Coordinator', crew: 'Crew' };

export default function InviteUserDialog({ open, onOpenChange }) {
  const { userRecord, orgId: activeOrgId } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: '', full_name: '', role: 'crew' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    setForm({ email: '', full_name: '', role: 'crew' });
    setError('');
    setInviteLink(null);
    setCopied(false);
    onOpenChange(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email) return setError('Email is required.');
    setCreating(true);
    try {
      // Use the active company from AuthContext (source of truth for the current workspace)
      let orgId = activeOrgId || userRecord?.org_id;
      if (!orgId) return setError('Could not determine your organization. Make sure you are inside a company workspace.');

      // Enforce plan user limit
      const { data: orgData } = await supabase.from('organizations').select('plan, name').eq('id', orgId).single();
      const { count: memberCount } = await supabase.from('company_memberships').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'active');
      const check = canAddUser(orgData?.plan, memberCount ?? 0);
      if (!check.allowed) return setError(check.reason);

      const { data: invite, error: invErr } = await supabase
        .from('pending_invites')
        .insert({
          email: form.email.trim().toLowerCase(),
          full_name: form.full_name || null,
          org_id: orgId,
          role: form.role,
          invite_type: 'team_member',
          invited_by: userRecord?.id,
        })
        .select()
        .single();

      if (invErr) throw invErr;

      const link = `${window.location.origin}/accept-invite?token=${invite.token}`;

      // Send branded invite email (non-blocking — show link regardless)
      supabase.functions.invoke('send-invite-email', {
        body: {
          to_email: form.email.trim().toLowerCase(),
          to_name: form.full_name || null,
          invite_link: link,
          org_name: orgData?.name || '',
          role: form.role,
          invite_type: 'team_member',
          invited_by_name: userRecord?.full_name || userRecord?.email || null,
        },
      }).then(({ error: fnErr, data: fnData }) => {
        if (fnErr) console.error('send-invite-email error:', fnErr);
        else console.log('send-invite-email result:', fnData);
      }).catch(e => console.error('send-invite-email exception:', e));

      setInviteLink(link);
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      setError(err?.message || 'Failed to create invite.');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Success screen ──
  if (inviteLink) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" /> Invite Created
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="flex items-start gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-3">
              <Mail className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-emerald-400">Invite ready for {form.email}</p>
                <p className="text-muted-foreground mt-0.5">
                  Send them this link — they'll set their own password and join your workspace as <strong className="text-foreground capitalize">{form.role}</strong>.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground mb-1">Invite Link (expires in 7 days)</p>
              <p className="text-xs font-mono text-foreground break-all">{inviteLink}</p>
            </div>

            <Button className="w-full gap-2" onClick={copyLink}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Invite Link'}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setInviteLink(null); setForm({ email: '', full_name: '', role: 'crew' }); }}>
              Invite Another
            </Button>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Form ──
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Invite New User
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            They'll receive a link to set up their account and join your workspace.
          </p>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="col-span-2">
              <Label>Full Name</Label>
              <Input
                placeholder="Jane Smith"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={creating} className="gap-2">
              <UserPlus className="w-4 h-4" />
              {creating ? 'Creating...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
