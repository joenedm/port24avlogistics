import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, Building2, Users, Mail, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
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

  const updateUserRole = async (userId, role) => {
    const { error } = await supabase.from('users').update({ role }).eq('id', userId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['platform-org-users', orgId] });
    toast.success('Role updated');
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

      {/* Users */}
      <div className="bg-[#131920] border border-white/5 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-[#1FB8A0]" /> Users</h2>
        {usersLoading ? <p className="text-gray-500 text-sm">Loading…</p> : users.length === 0 ? (
          <p className="text-gray-500 text-sm">No users yet.</p>
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
