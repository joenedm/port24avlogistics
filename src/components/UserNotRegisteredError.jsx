import React, { useState } from 'react';
import { db } from '@/api/db';
import { Clock, XCircle, CheckCircle, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const LOGO_URL = 'https://media.base44.com/images/public/69d5151f0495918d567d1066/eab1935ba_generated_image.png';

const ROLE_LABELS = {
  admin: 'Admin',
  director: 'Director',
  manager: 'Manager',
  coordinator: 'Coordinator',
  crew: 'Crew',
};

// ─── Invite Onboarding (status: 'invited') ────────────────────────────────────
function InviteOnboarding({ email, assignedRole, pendingInviteId, fullName, company, onDone = () => {} }) {
  const [step, setStep] = useState('welcome'); // 'welcome' | 'form' | 'done'
  const [form, setForm] = useState({ full_name: fullName || '', company: company || '', phone: '', username: '', password: '', job_title: '' });
  const [saving, setSaving] = useState(false);
  const roleLabel = ROLE_LABELS[assignedRole] || assignedRole || 'Team Member';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    // Update the existing record: fill in info, set approved, keep assigned role intact
    const payload = {
      full_name: form.full_name,
      company: form.company,
      phone: form.phone,
      username: form.username,
      job_title: form.job_title,
      status: 'approved',
      // role is NOT touched — stays as assigned by admin
    };
    // Call backend function to update User record with service role permissions
    await db.functions.invoke('completeOnboarding', { profile: payload });
    if (form.password) {
      try { await db.auth.updateMe({ password: form.password }); } catch (_) {}
    }
    setSaving(false);
    setStep('done');
    // Re-run auth check — status is now 'approved', user enters the app directly
    onDone();
  };

  if (step === 'welcome') {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-5">
          <UserCheck className="w-6 h-6 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">You've Been Invited</h1>
        <p className="text-slate-400 text-sm mb-4">
          You've been invited to join <span className="text-white font-medium">ShowOps</span>.
        </p>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-3 mb-6 inline-block">
          <p className="text-xs text-blue-300 uppercase tracking-wide mb-0.5">Your Role</p>
          <p className="text-lg font-bold text-blue-200">{roleLabel}</p>
        </div>
        <p className="text-slate-500 text-xs mb-6">
          Before you can access ShowOps, please complete a short info form.
        </p>
        <button
          onClick={() => setStep('form')}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
        >
          Continue to Form →
        </button>
        <button
          onClick={() => db.auth.logout('/')}
          className="w-full mt-3 py-2 rounded-xl border border-white/10 text-xs font-medium text-slate-500 hover:bg-white/5 transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold mb-3">You're All Set!</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-2">
          Your account is ready. You've been set up as a <span className="text-blue-300 font-medium">{roleLabel}</span>.
        </p>
        <p className="text-slate-500 text-xs mb-6">Redirecting you into the app…</p>
      </div>
    );
  }

  // step === 'form'
  return (
    <>
      <div className="flex items-center gap-2 mb-5">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5">
          <p className="text-xs text-blue-300">Invited as <span className="font-bold">{roleLabel}</span></p>
        </div>
      </div>
      <h1 className="text-xl font-bold mb-1">Complete Your Profile</h1>
      <p className="text-slate-400 text-sm mb-5">Fill out the form below to finish setting up your account.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Full Name *</label>
          <input
            required
            value={form.full_name}
            onChange={e => setForm({ ...form, full_name: e.target.value })}
            placeholder="Jane Smith"
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Email</label>
          <input
            value={email}
            readOnly
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Job Title *</label>
          <input
            required
            value={form.job_title}
            onChange={e => setForm({ ...form, job_title: e.target.value })}
            placeholder="e.g. Audio Engineer, Stage Manager"
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Username *</label>
          <input
            required
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            placeholder="janesmith"
            autoComplete="username"
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Password *</label>
          <input
            required
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="Choose a strong password"
            autoComplete="new-password"
            minLength={8}
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Company</label>
          <input
            value={form.company}
            onChange={e => setForm({ ...form, company: e.target.value })}
            placeholder="Your company or organization"
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Phone (optional)</label>
          <input
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="+1 555 000 0000"
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
        >
          {saving ? 'Setting up account...' : 'Create Account'}
        </button>
      </form>
      <button
        onClick={() => db.auth.logout('/')}
        className="w-full mt-3 py-2 rounded-xl border border-white/10 text-xs font-medium text-slate-500 hover:bg-white/5 transition-colors"
      >
        Sign out
      </button>
    </>
  );
}

// ─── Wrapper: calls checkAppState after form done so user enters app directly ─
function InviteOnboardingWrapper({ authError }) {
  const { checkAppState } = useAuth();
  return (
    <InviteOnboarding
      email={authError?.email || ''}
      assignedRole={authError?.assignedRole}
      pendingInviteId={authError?.pendingInviteId}
      fullName={authError?.fullName}
      company={authError?.company}
      onDone={checkAppState}
    />
  );
}

// ─── No Invitation (no record found) ────────────────────────────────────────
function NoInvitationScreen() {
  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-full bg-slate-500/10 flex items-center justify-center mx-auto mb-5">
        <XCircle className="w-6 h-6 text-slate-400" />
      </div>
      <h1 className="text-2xl font-bold mb-3">Invitation Required</h1>
      <p className="text-slate-400 text-sm leading-relaxed mb-2">
        ShowOps is invite-only. You must receive an invitation from an administrator before you can create an account.
      </p>
      <p className="text-slate-500 text-xs mb-6">
        If you believe this is a mistake, contact your administrator and ask them to invite your email address.
      </p>
      <button
        onClick={() => db.auth.logout('/')}
        className="w-full py-2.5 rounded-xl border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
const UserNotRegisteredError = ({ authError }) => {
  const message = authError?.message || '';

  // Invited → show onboarding (welcome screen + info form)
  if (message === 'invited') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-2.5 mb-10 justify-center">
            <img src={LOGO_URL} alt="ShowOps" className="w-9 h-9 rounded-xl object-cover" />
            <span className="font-bold text-lg">ShowOps</span>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8">
            <InviteOnboardingWrapper authError={authError} />
          </div>
        </div>
      </div>
    );
  }

  // Not registered → invite-only wall
  if (message === 'not_registered') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-2.5 mb-10 justify-center">
            <img src={LOGO_URL} alt="ShowOps" className="w-9 h-9 rounded-xl object-cover" />
            <span className="font-bold text-lg">ShowOps</span>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8">
            <NoInvitationScreen />
          </div>
        </div>
      </div>
    );
  }

  // All other blocked states
  let icon, iconBg, title, desc;
  if (message === 'pending') {
    icon = <Clock className="w-6 h-6 text-amber-400" />;
    iconBg = 'bg-amber-500/10';
    title = 'Awaiting Approval';
    desc = 'Your access request has been submitted and is awaiting admin approval.';
  } else if (message === 'rejected') {
    icon = <XCircle className="w-6 h-6 text-red-400" />;
    iconBg = 'bg-red-500/10';
    title = 'Access Denied';
    desc = 'Your access request was denied. Contact your administrator.';
  } else if (message === 'inactive') {
    icon = <XCircle className="w-6 h-6 text-slate-400" />;
    iconBg = 'bg-slate-500/10';
    title = 'Account Inactive';
    desc = 'Your account has been deactivated. Contact your administrator.';
  } else if (message === 'no_role') {
    icon = <Clock className="w-6 h-6 text-amber-400" />;
    iconBg = 'bg-amber-500/10';
    title = 'Account Not Configured';
    desc = 'Your account is approved but has no role assigned. Contact your administrator.';
  } else {
    icon = <XCircle className="w-6 h-6 text-red-400" />;
    iconBg = 'bg-red-500/10';
    title = 'Access Blocked';
    desc = 'You do not have access to this system. Contact your administrator.';
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <img src={LOGO_URL} alt="ShowOps" className="w-9 h-9 rounded-xl object-cover" />
          <span className="font-bold text-lg">ShowOps</span>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 text-center">
          <div className={`w-14 h-14 rounded-full ${iconBg} flex items-center justify-center mx-auto mb-5`}>
            {icon}
          </div>
          <h1 className="text-2xl font-bold mb-3">{title}</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">{desc}</p>
          <button
            onClick={() => db.auth.logout('/')}
            className="w-full py-2.5 rounded-xl border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;