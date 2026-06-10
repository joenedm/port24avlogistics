import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { UserPlus, Copy, Check, Eye, EyeOff, RefreshCw, LogIn, Mail, AlertCircle, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const ROLE_LABELS = { admin: 'Admin', director: 'Director', manager: 'Manager', coordinator: 'Coordinator', crew: 'Crew' };

function generatePassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function InviteUserDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: '', full_name: '', company: '', role: 'crew', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null); // { email, password, loginUrl, emailSent, emailError }
  const [copied, setCopied] = useState({});
  const [resending, setResending] = useState(false);
  const [resendResult, setResendResult] = useState(null); // 'sent' | 'failed'

  const handleClose = () => {
    setForm({ email: '', full_name: '', company: '', role: 'crew', password: '' });
    setError('');
    setSuccess(null);
    setCopied({});
    setShowPassword(false);
    setResending(false);
    setResendResult(null);
    onOpenChange(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.password || form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setCreating(true);
    try {
      const res = await base44.functions.invoke('createWorkspaceUser', {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
        company: form.company,
      });
      const data = res.data;
      if (!data?.success) throw new Error(data?.error || 'Account creation failed.');
      setSuccess({
        email: form.email,
        password: form.password,
        loginUrl: data.login_url,
        emailSent: data.email_sent,
        emailError: data.email_error || null,
        fullName: form.full_name,
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendResult(null);
    try {
      const res = await base44.functions.invoke('sendCredentialsEmail', {
        email: success.email,
        password: success.password,
        full_name: success.fullName,
        login_url: success.loginUrl,
      });
      if (res.data?.sent) {
        setResendResult('sent');
        setSuccess(s => ({ ...s, emailSent: true, emailError: null }));
      } else {
        setResendResult('failed');
      }
    } catch {
      setResendResult('failed');
    } finally {
      setResending(false);
    }
  };

  const copyText = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopied(c => ({ ...c, [key]: true }));
    setTimeout(() => setCopied(c => ({ ...c, [key]: false })), 2000);
  };

  // ── Success screen ──
  if (success) {
    const emailFailed = !success.emailSent && success.emailError;

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" /> Account Created
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">

            {/* Email send status — prominent */}
            {success.emailSent ? (
              <div className="flex items-start gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-3">
                <Mail className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-emerald-400">Credentials email sent</p>
                  <p className="text-muted-foreground mt-0.5">
                    Login details were emailed to <strong className="text-foreground">{success.email}</strong>. They can sign in immediately.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-3">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-sm flex-1">
                  <p className="font-medium text-amber-400">Email not sent</p>
                  <p className="text-muted-foreground mt-0.5">{success.emailError || 'Could not deliver the credentials email.'}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5 border-amber-500/30 hover:bg-amber-500/10"
                      onClick={handleResend}
                      disabled={resending}
                    >
                      {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      {resending ? 'Sending...' : 'Resend Email'}
                    </Button>
                    {resendResult === 'sent' && <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Sent!</span>}
                    {resendResult === 'failed' && <span className="text-xs text-red-400">Failed again — share manually below.</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Resend option even on success */}
            {success.emailSent && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Didn't receive it?</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs gap-1 px-2"
                  onClick={handleResend}
                  disabled={resending}
                >
                  {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  {resending ? 'Sending...' : 'Resend'}
                </Button>
                {resendResult === 'sent' && <span className="text-emerald-400">Sent!</span>}
              </div>
            )}

            {/* Credentials — backup copy panel */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Credentials (backup)</p>
              <div className="rounded-lg border border-border bg-muted/40 divide-y divide-border">
                {[
                  { label: 'Email / Username', value: success.email, key: 'email' },
                  { label: 'Password', value: success.password, key: 'password', mono: true },
                  { label: 'Login URL', value: success.loginUrl, key: 'url' },
                ].map(({ label, value, key, mono }) => (
                  <div key={key} className="flex items-center justify-between px-3 py-2.5 gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-sm text-foreground truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyText(key, value)}>
                      {copied[key] ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button variant="outline" className="w-full gap-2" onClick={() => window.open(success.loginUrl, '_blank')}>
              <LogIn className="w-4 h-4" /> Open Login Page
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Creation form ──
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Create New User
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Set credentials — login details will be emailed to the user automatically.</p>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Email (login username) *</Label>
              <Input
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="col-span-2">
              <Label>Password *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Generate password"
                  onClick={() => { setForm(f => ({ ...f, password: generatePassword() })); setShowPassword(true); }}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="col-span-2">
              <Label>Full Name</Label>
              <Input
                placeholder="Jane Smith"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div>
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
            <div>
              <Label>Company</Label>
              <Input
                placeholder="Company name"
                value={form.company}
                onChange={e => setForm({ ...form, company: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={creating} className="gap-2">
              <UserPlus className="w-4 h-4" />
              {creating ? 'Creating Account...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}