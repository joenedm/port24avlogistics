import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Camera, Phone, FileText, Tag, X, Loader2, CheckCircle } from 'lucide-react';

const LOGO_URL = 'https://media.base44.com/images/public/69d5151f0495918d567d1066/eab1935ba_generated_image.png';

const SPECIALTY_OPTIONS = [
  'Audio', 'Video', 'Lighting', 'Rigging', 'Stage Management',
  'Camera Op', 'A1', 'A2', 'TD', 'LED/Screens', 'Broadcast',
  'Streaming', 'Graphics', 'Projection', 'Power/Electric',
];

export default function Onboarding() {
  const { userRecord, checkAppState } = useAuth();
  const [form, setForm] = useState({
    phone: userRecord?.phone || '',
    bio: userRecord?.bio || '',
    specialties: userRecord?.specialties || [],
    profile_picture_url: userRecord?.profile_picture_url || '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [specialtyInput, setSpecialtyInput] = useState('');

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, profile_picture_url: file_url }));
    } finally {
      setUploading(false);
    }
  };

  const addSpecialty = (tag) => {
    const t = tag.trim();
    if (t && !form.specialties.includes(t)) {
      setForm(f => ({ ...f, specialties: [...f.specialties, t] }));
    }
    setSpecialtyInput('');
  };

  const removeSpecialty = (tag) => {
    setForm(f => ({ ...f, specialties: f.specialties.filter(s => s !== tag) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (userRecord?.id) {
        await base44.entities.User.update(userRecord.id, {
          ...form,
          onboarding_complete: true,
        });
      }
      setDone(true);
      setTimeout(() => checkAppState(), 1200);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3">You're All Set!</h1>
          <p className="text-slate-400 text-sm">Taking you to the dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="ShowOps" className="w-12 h-12 rounded-xl object-cover mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Complete Your Profile</h1>
          <p className="text-slate-400 text-sm mt-1">One last step before you access ShowOps</p>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Profile Picture */}
            <div>
              <label className="block text-xs text-slate-400 mb-2">Profile Picture</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {form.profile_picture_url
                    ? <img src={form.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
                    : <Camera className="w-6 h-6 text-slate-500" />
                  }
                </div>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg text-sm text-slate-300 hover:bg-white/[0.06] transition-colors">
                    {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : 'Upload Photo'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 555 000 0000"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Bio / Notes</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <textarea
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="A little about yourself, your experience, availability…"
                  rows={3}
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>
            </div>

            {/* Specialties */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Technical Specialties</label>
              {/* Quick-select chips */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {SPECIALTY_OPTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => form.specialties.includes(s) ? removeSpecialty(s) : addSpecialty(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.specialties.includes(s)
                        ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                        : 'bg-white/[0.04] border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {/* Custom input */}
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={specialtyInput}
                  onChange={e => setSpecialtyInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSpecialty(specialtyInput); } }}
                  placeholder="Add custom specialty, press Enter"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              {/* Selected tags */}
              {form.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.specialties.map(s => (
                    <span key={s} className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs px-2.5 py-1 rounded-full">
                      {s}
                      <button type="button" onClick={() => removeSpecialty(s)} className="hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Complete Profile →'}
            </button>
          </form>
        </div>

        <button
          onClick={() => base44.auth.logout('/')}
          className="w-full mt-4 py-2 text-xs text-slate-500 hover:text-slate-400 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}