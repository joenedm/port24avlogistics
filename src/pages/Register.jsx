import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { User, Building2, Mail, ChevronDown, Plus, Loader2, CheckCircle } from 'lucide-react';

const LOGO_URL = 'https://media.base44.com/images/public/69d5151f0495918d567d1066/eab1935ba_generated_image.png';

export default function Register() {
  const [form, setForm] = useState({ full_name: '', email: '', company: '' });
  const [companies, setCompanies] = useState([]);
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.entities.User.list().then(users => {
      const unique = [...new Set(users.map(u => u.company).filter(Boolean))].sort();
      setCompanies(unique);
    }).catch(() => {});
  }, []);

  const filteredCompanies = companies.filter(c =>
    c.toLowerCase().includes(companySearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.full_name || !form.email || !form.company) {
      setError('All fields are required.');
      return;
    }
    setSubmitting(true);
    try {
      await base44.functions.invoke('requestAccess', {
        full_name: form.full_name,
        email: form.email,
        company: form.company,
      });
      setDone(true);
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <img src={LOGO_URL} alt="ShowOps" className="w-12 h-12 rounded-xl object-cover mx-auto mb-6" />
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Request Submitted!</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Thanks for joining ShowOps! Our admins are reviewing your request.<br />
            You'll receive an email once your access is approved.
          </p>
          <button
            onClick={() => base44.auth.redirectToLogin('/')}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <img src={LOGO_URL} alt="ShowOps" className="w-12 h-12 rounded-xl object-cover mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Request Access to ShowOps</h1>
          <p className="text-slate-400 text-sm mt-2">Production & AV crew management platform</p>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  required
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Jane Smith"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="jane@company.com"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Company */}
            <div className="relative">
              <label className="block text-xs text-slate-400 mb-1.5">Company / Organization *</label>
              {addingNew ? (
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    autoFocus
                    value={form.company}
                    onChange={e => setForm({ ...form, company: e.target.value })}
                    placeholder="Enter company name"
                    className="w-full bg-white/[0.06] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => { setAddingNew(false); setForm({ ...form, company: '' }); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowCompanyDropdown(v => !v)}
                    className="w-full flex items-center justify-between bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-left focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <span className={form.company ? 'text-white' : 'text-slate-500'}>
                      {form.company || 'Select or search company…'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  </button>
                  {showCompanyDropdown && (
                    <div className="absolute z-10 top-full mt-1 w-full bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                      <div className="p-2 border-b border-white/[0.06]">
                        <input
                          autoFocus
                          value={companySearch}
                          onChange={e => setCompanySearch(e.target.value)}
                          placeholder="Search companies…"
                          className="w-full bg-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredCompanies.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => { setForm({ ...form, company: c }); setShowCompanyDropdown(false); setCompanySearch(''); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors"
                          >
                            {c}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => { setAddingNew(true); setShowCompanyDropdown(false); setCompanySearch(''); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-blue-400 hover:bg-blue-500/10 transition-colors flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" /> Add new company…
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Request Access →'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Already have an account?{' '}
          <button onClick={() => base44.auth.redirectToLogin('/')} className="text-blue-400 hover:text-blue-300">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}