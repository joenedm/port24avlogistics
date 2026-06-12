import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Plus, Eye, CheckCircle, XCircle, Clock, Copy, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLOR = {
  active: 'text-emerald-400 bg-emerald-400/10',
  trial: 'text-yellow-400 bg-yellow-400/10',
  suspended: 'text-red-400 bg-red-400/10',
  cancelled: 'text-gray-400 bg-gray-400/10',
};

function CreateOrgDialog({ onClose, onCreated }) {
  const { userRecord } = useAuth();
  const [form, setForm] = useState({ name: '', plan: 'trial', admin_email: '', admin_name: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.admin_email) return toast.error('Company name and admin email required');
    setLoading(true);
    try {
      const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .insert({ name: form.name, slug, plan: form.plan, status: 'trial' })
        .select().single();
      if (orgErr) throw orgErr;

      const { data: invite, error: invErr } = await supabase
        .from('pending_invites')
        .insert({
          email: form.admin_email.trim().toLowerCase(),
          full_name: form.admin_name || null,
          org_id: org.id,
          role: 'admin',
          invited_by: userRecord?.id,
        })
        .select().single();
      if (invErr) throw invErr;

      const link = `${window.location.origin}/accept-invite?token=${invite.token}`;

      // Send invite email (non-blocking)
      supabase.functions.invoke('send-invite-email', {
        body: {
          to_email: form.admin_email.trim().toLowerCase(),
          to_name: form.admin_name || null,
          invite_link: link,
          org_name: form.name,
          role: 'admin',
          invited_by_name: userRecord?.full_name || userRecord?.email || 'Port 24',
        },
      }).catch(() => {});

      setInviteLink(link);
      onCreated(org);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#131920] border border-white/10 rounded-2xl p-8 w-full max-w-md">
        {inviteLink ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[#1FB8A0]/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-[#1FB8A0]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Company Created!</h2>
            <p className="text-sm text-gray-400 mb-6">Send this link to the company admin to set up their account. It expires in 7 days.</p>
            <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-left mb-4">
              <p className="text-xs text-gray-500 mb-1">Invite Link</p>
              <p className="text-xs text-[#1FB8A0] break-all font-mono">{inviteLink}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={copyLink} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1FB8A0] text-black font-semibold text-sm">
                <Copy className="w-4 h-4" /> Copy Link
              </button>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-white transition-colors">Done</button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white mb-6">Add New Company</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Company Name *</label>
                <input className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#1FB8A0]/50" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme Events LLC" required />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Plan</label>
                <select className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none" value={form.plan} onChange={e => set('plan', e.target.value)}>
                  <option value="trial">Trial</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Admin Email *</label>
                <input type="email" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#1FB8A0]/50" value={form.admin_email} onChange={e => set('admin_email', e.target.value)} placeholder="admin@company.com" required />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Admin Full Name</label>
                <input className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#1FB8A0]/50" value={form.admin_name} onChange={e => set('admin_name', e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-[#1FB8A0] text-black font-semibold text-sm disabled:opacity-50">
                  {loading ? 'Creating…' : 'Create & Get Invite Link'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const DEV_ADMIN_EMAILS = ['joe@nedm.com'];

function AddPlatformStaffDialog({ onClose }) {
  const { userRecord } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { data: invite, error } = await supabase
        .from('pending_invites')
        .insert({
          email: email.trim().toLowerCase(),
          full_name: name || null,
          org_id: '00000000-0000-0000-0000-000000000001',
          role: 'platform_admin',
          invited_by: userRecord?.id,
        })
        .select().single();
      if (error) throw error;
      const link = `${window.location.origin}/platform/join?token=${invite.token}`;
      setInviteLink(link);
      qc.invalidateQueries({ queryKey: ['platform-staff-invites'] });

      // Send email
      supabase.functions.invoke('send-invite-email', {
        body: {
          to_email: email.trim().toLowerCase(),
          to_name: name || null,
          invite_link: link,
          org_name: 'Port 24 Platform',
          role: 'Platform Admin',
          invited_by_name: userRecord?.full_name || userRecord?.email || 'Port 24',
        },
      }).catch(() => {});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#131920] border border-white/10 rounded-2xl p-8 w-full max-w-md">
        {inviteLink ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[#1FB8A0]/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-[#1FB8A0]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Invite Sent!</h2>
            <p className="text-sm text-gray-400 mb-6">Send this link to give them platform admin access. Expires in 7 days.</p>
            <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-left mb-4">
              <p className="text-xs text-gray-500 mb-1">Platform Invite Link</p>
              <p className="text-xs text-[#1FB8A0] break-all font-mono">{inviteLink}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!'); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1FB8A0] text-black font-semibold text-sm">
                <Copy className="w-4 h-4" /> Copy Link
              </button>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-white transition-colors">Done</button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white mb-1">Add Platform Staff</h2>
            <p className="text-sm text-gray-500 mb-6">They'll receive a link to create their platform admin account.</p>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Email *</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#1FB8A0]/50"
                  placeholder="staff@port24.com" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#1FB8A0]/50"
                  placeholder="Jane Smith" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-[#1FB8A0] text-black font-semibold text-sm disabled:opacity-50">
                  {loading ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function PlatformAdmin() {
  const { isPlatformAdmin, userRecord, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState('companies');
  const [showAddStaff, setShowAddStaff] = useState(false);
  const isDevAdmin = DEV_ADMIN_EMAILS.includes(userRecord?.email?.toLowerCase());

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['platform-orgs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['platform-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: platformStaff = [] } = useQuery({
    queryKey: ['platform-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*').eq('is_platform_admin', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: staffInvites = [] } = useQuery({
    queryKey: ['platform-staff-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_invites')
        .select('*')
        .eq('role', 'platform_admin')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const removePlatformAdmin = async (userId) => {
    if (!isDevAdmin) return toast.error('Only dev admins can remove platform staff');
    const { error } = await supabase.from('users').update({ is_platform_admin: false }).eq('id', userId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['platform-staff'] });
    toast.success('Platform access revoked');
  };

  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['platform-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_invites')
        .select('*, organizations(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const revokeInvite = async (id) => {
    const { error } = await supabase.from('pending_invites').update({ status: 'expired' }).eq('id', id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['platform-invites'] });
    toast.success('Invite revoked');
  };

  const copyInviteLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/accept-invite?token=${token}`);
    toast.success('Invite link copied!');
  };

  const updateOrgStatus = async (orgId, status) => {
    const { error } = await supabase.from('organizations').update({ status }).eq('id', orgId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['platform-orgs'] });
    toast.success(`Organization ${status}`);
  };

  const usersForOrg = (orgId) => allUsers.filter(u => u.org_id === orgId);

  // Guard after all hooks
  if (isLoadingAuth) return null;
  if (!isPlatformAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Access denied. Platform admins only.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {showCreate && (
        <CreateOrgDialog
          onClose={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['platform-orgs'] }); }}
          onCreated={() => qc.invalidateQueries({ queryKey: ['platform-orgs'] })}
        />
      )}
      {showAddStaff && <AddPlatformStaffDialog onClose={() => setShowAddStaff(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#1FB8A0] animate-pulse" />
            <span className="text-xs font-semibold tracking-widest text-[#1FB8A0] uppercase">Port 24 Platform</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Platform Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Manage companies and platform staff</p>
        </div>
        {tab === 'companies' && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1FB8A0] text-black font-semibold text-sm hover:bg-[#17907C] transition-colors">
            <Plus className="w-4 h-4" /> Add Company
          </button>
        )}
        {tab === 'staff' && isDevAdmin && (
          <button onClick={() => setShowAddStaff(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1FB8A0] text-black font-semibold text-sm hover:bg-[#17907C] transition-colors">
            <UserPlus className="w-4 h-4" /> Add Staff
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-[#0D1219] border border-white/5 rounded-xl p-1 w-fit">
        {[
          { id: 'companies', label: 'Companies', icon: Building2 },
          { id: 'staff', label: 'Platform Staff', icon: ShieldCheck },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-[#1FB8A0] text-black' : 'text-gray-400 hover:text-white'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ── STAFF TAB ── */}
      {tab === 'staff' && (
        <div className="space-y-6">
          {/* Active platform staff */}
          <div className="bg-[#131920] border border-white/5 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-[#1FB8A0]" />
              <h2 className="text-sm font-semibold text-white">Platform Admins</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#1FB8A0]/10 text-[#1FB8A0] font-medium">{platformStaff.length}</span>
            </div>
            {platformStaff.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No platform admins yet.</p>
            ) : (
              <div className="space-y-2">
                {platformStaff.map(u => {
                  const isDevUser = DEV_ADMIN_EMAILS.includes(u.email?.toLowerCase());
                  return (
                    <div key={u.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1FB8A0]/10 flex items-center justify-center text-[#1FB8A0] text-xs font-bold">
                          {(u.full_name || u.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">{u.full_name || u.email}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                        {isDevUser && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-medium">Dev Admin</span>
                        )}
                      </div>
                      {isDevAdmin && !isDevUser && (
                        <button onClick={() => removePlatformAdmin(u.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors" title="Revoke platform access">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending staff invites */}
          {staffInvites.length > 0 && (
            <div className="bg-[#131920] border border-yellow-500/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-yellow-400" />
                <h2 className="text-sm font-semibold text-white">Pending Staff Invites</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 font-medium">{staffInvites.length}</span>
              </div>
              <div className="space-y-2">
                {staffInvites.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm text-white font-medium">{inv.email}</p>
                      <p className="text-xs text-gray-500">Expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/platform/join?token=${inv.token}`); toast.success('Copied!'); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs transition-colors">
                        <Copy className="w-3.5 h-3.5" /> Copy Link
                      </button>
                      <button onClick={() => revokeInvite(inv.id)} className="px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-400/10 text-xs transition-colors">
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── COMPANIES TAB ── */}
      {tab === 'companies' && <>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Companies', value: orgs.length, icon: Building2 },
          { label: 'Active', value: orgs.filter(o => o.status === 'active').length, icon: CheckCircle },
          { label: 'On Trial', value: orgs.filter(o => o.plan === 'trial').length, icon: Clock },
          { label: 'Total Users', value: allUsers.filter(u => !u.is_platform_admin).length, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-[#131920] border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-[#1FB8A0]" />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="bg-[#131920] border border-yellow-500/20 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-semibold text-white">Pending Invites</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 font-medium">{pendingInvites.length}</span>
          </div>
          <div className="space-y-2">
            {pendingInvites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm text-white font-medium">{inv.email}</p>
                  <p className="text-xs text-gray-500">{inv.organizations?.name} · {inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => copyInviteLink(inv.token)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs transition-colors">
                    <Copy className="w-3.5 h-3.5" /> Copy Link
                  </button>
                  <button onClick={() => revokeInvite(inv.id)} className="px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-400/10 text-xs transition-colors">
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Company list */}
      {isLoading ? (
        <div className="text-center text-gray-500 py-20">Loading…</div>
      ) : (
        <div className="space-y-3">
          {orgs.map(org => {
            const users = usersForOrg(org.id);
            const isPort24 = org.id === '00000000-0000-0000-0000-000000000001';
            return (
              <div key={org.id} className="bg-[#131920] border border-white/5 rounded-xl p-5 flex items-center justify-between hover:border-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#1FB8A0]/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[#1FB8A0]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{org.name}</span>
                      {isPort24 && <span className="text-xs px-2 py-0.5 rounded-full bg-[#1FB8A0]/20 text-[#1FB8A0] font-medium">Platform Owner</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[org.status] || STATUS_COLOR.active}`}>
                        {org.status}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{org.plan} plan</span>
                      <span className="text-xs text-gray-500">{users.length} user{users.length !== 1 ? 's' : ''}</span>
                      {org.created_at && <span className="text-xs text-gray-600">Since {new Date(org.created_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isPort24 && (
                    <button
                      onClick={() => updateOrgStatus(org.id, org.status === 'active' ? 'suspended' : 'active')}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                      title={org.status === 'active' ? 'Suspend' : 'Activate'}
                    >
                      {org.status === 'active'
                        ? <XCircle className="w-4 h-4 text-red-400" />
                        : <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/platform/org/${org.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Manage
                  </button>
                </div>
              </div>
            );
          })}

          {orgs.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No companies yet. Add your first one.</p>
            </div>
          )}
        </div>
      )}

      </> }
    </div>
  );
}
