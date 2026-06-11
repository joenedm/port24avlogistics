import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, Building2, Users, Mail, Shield, ToggleLeft, ToggleRight, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_COLORS = {
  admin: 'text-blue-400 bg-blue-400/10',
  manager: 'text-purple-400 bg-purple-400/10',
  crew: 'text-gray-400 bg-gray-400/10',
};

export default function PlatformOrgDetail() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { isPlatformAdmin } = useAuth();
  const qc = useQueryClient();

  if (!isPlatformAdmin) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Access denied.</p></div>;
  }

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['platform-org', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('organizations').select('*').eq('id', orgId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['platform-org-users', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*').eq('org_id', orgId).order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: shows = [] } = useQuery({
    queryKey: ['platform-org-shows', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('shows').select('id, name, status, created_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
  });

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', full_name: '', role: 'admin' });
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      const { data: invite, error: invErr } = await supabase
        .from('invites')
        .insert({ email: inviteForm.email.trim().toLowerCase(), full_name: inviteForm.full_name || null, org_id: orgId, role: inviteForm.role })
        .select().single();
      if (invErr) throw invErr;

      const link = `${window.location.origin}/accept-invite?token=${invite.token}`;
      const { error: fnErr, data: fnData } = await supabase.functions.invoke('send-invite-email', {
        body: { to_email: inviteForm.email.trim().toLowerCase(), to_name: inviteForm.full_name || null, invite_link: link, org_name: org?.name || '', role: inviteForm.role, invited_by_name: 'Port 24 Admin' },
      });
      if (fnErr) console.error('Email error:', fnErr);
      else console.log('Email sent:', fnData);

      setInviteLink(link);
      qc.invalidateQueries({ queryKey: ['platform-org-users', orgId] });
      toast.success('Invite created' + (!fnErr ? ' & email sent' : ' (email failed — use link below)'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setInviting(false);
    }
  };

  const updateUserRole = async (userId, role) => {
    const { error } = await supabase.from('users').update({ role }).eq('id', userId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['platform-org-users', orgId] });
    toast.success('Role updated');
  };

  const removeUser = async (userId, userEmail) => {
    if (!confirm(`Remove ${userEmail} from ${org?.name}? This cannot be undone.`)) return;
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['platform-org-users', orgId] });
    toast.success('User removed');
  };

  if (orgLoading) return <div className="text-center py-20 text-gray-500">Loading…</div>;
  if (!org) return <div className="text-center py-20 text-gray-500">Organization not found.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate('/platform')} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to all companies
      </button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-[#1FB8A0]/10 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-[#1FB8A0]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{org.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-500 capitalize">{org.plan} plan</span>
            <span className="text-xs text-gray-500 capitalize">{org.status}</span>
            {org.created_at && <span className="text-xs text-gray-600">Created {new Date(org.created_at).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Users', value: users.length },
          { label: 'Recent Shows', value: shows.length },
          { label: 'Plan', value: org.plan?.charAt(0).toUpperCase() + org.plan?.slice(1) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#131920] border border-white/5 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-[#131920] border border-white/10 rounded-2xl p-6 w-full max-w-sm relative">
            <button onClick={() => { setShowInvite(false); setInviteLink(''); }} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            <h3 className="text-white font-bold text-lg mb-4">Invite User to {org?.name}</h3>
            {inviteLink ? (
              <div>
                <p className="text-sm text-[#1FB8A0] mb-3">✓ Invite created! Share this link:</p>
                <div className="bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-gray-300 break-all mb-4">{inviteLink}</div>
                <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!'); }} className="w-full py-2.5 rounded-xl bg-[#1FB8A0] text-black font-semibold text-sm">Copy Link</button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-3">
                <input required type="email" placeholder="Email address" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none" />
                <input type="text" placeholder="Full name (optional)" value={inviteForm.full_name} onChange={e => setInviteForm(f => ({ ...f, full_name: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none" />
                <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-300 outline-none">
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="crew">Crew</option>
                </select>
                <button type="submit" disabled={inviting} className="w-full py-2.5 rounded-xl bg-[#1FB8A0] text-black font-semibold text-sm disabled:opacity-50">{inviting ? 'Sending…' : 'Send Invite'}</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Users */}
      <div className="bg-[#131920] border border-white/5 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Users className="w-4 h-4 text-[#1FB8A0]" /> Users</h2>
          <button onClick={() => { setShowInvite(true); setInviteLink(''); setInviteForm({ email: '', full_name: '', role: 'admin' }); }} className="flex items-center gap-1.5 text-xs font-medium text-[#1FB8A0] hover:text-white transition-colors border border-[#1FB8A0]/30 hover:border-white/20 rounded-lg px-3 py-1.5">
            <UserPlus className="w-3.5 h-3.5" /> Invite User
          </button>
        </div>
        {usersLoading ? <p className="text-gray-500 text-sm">Loading…</p> : users.length === 0 ? (
          <p className="text-gray-500 text-sm">No users yet. Use the Invite User button above to add the first user.</p>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm text-white font-medium">{u.full_name || '(no name)'}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[u.role] || ROLE_COLORS.crew}`}>{u.role}</span>
                  <select
                    value={u.role || 'crew'}
                    onChange={e => updateUserRole(u.id, e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-300 outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="crew">Crew</option>
                  </select>
                  <button onClick={() => removeUser(u.id, u.email)} className="text-red-400 hover:text-red-300 transition-colors p-1 rounded" title="Remove user">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Shows */}
      <div className="bg-[#131920] border border-white/5 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Recent Shows</h2>
        {shows.length === 0 ? <p className="text-gray-500 text-sm">No shows yet.</p> : (
          <div className="space-y-2">
            {shows.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <p className="text-sm text-white">{s.name}</p>
                <span className="text-xs text-gray-500 capitalize">{s.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
