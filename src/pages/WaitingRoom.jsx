import React from 'react';
import { base44 } from '@/api/base44Client';
import { Clock } from 'lucide-react';

const LOGO_URL = 'https://media.base44.com/images/public/69d5151f0495918d567d1066/eab1935ba_generated_image.png';

export default function WaitingRoom() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <img src={LOGO_URL} alt="ShowOps" className="w-12 h-12 rounded-xl object-cover mx-auto mb-8" />

        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
          <Clock className="w-8 h-8 text-amber-400" />
        </div>

        <h1 className="text-2xl font-bold mb-3">Waiting for Approval</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-2">
          Thanks for joining ShowOps! Our admins are reviewing your request.
        </p>
        <p className="text-slate-500 text-xs mb-8">
          You'll get access once an administrator approves your account.
        </p>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-4 mb-8 text-left space-y-2">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">What happens next?</p>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs text-blue-400 font-bold">1</span>
            </div>
            <p className="text-sm text-slate-300">An admin reviews your request</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs text-blue-400 font-bold">2</span>
            </div>
            <p className="text-sm text-slate-300">You're assigned a role and approved</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs text-blue-400 font-bold">3</span>
            </div>
            <p className="text-sm text-slate-300">You complete your profile and gain access</p>
          </div>
        </div>

        <button
          onClick={() => base44.auth.logout('/')}
          className="w-full py-2.5 border border-white/10 rounded-xl text-sm text-slate-400 hover:bg-white/5 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}