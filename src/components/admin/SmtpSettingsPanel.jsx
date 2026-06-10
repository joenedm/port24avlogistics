import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = {
  from_email: '',
  from_name: '',
};

export default function SmtpSettingsPanel() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['workspaceEmailSettings'],
    queryFn: () => db.entities.WorkspaceEmailSettings.list(),
  });

  const existing = settings[0];

  useEffect(() => {
    if (!loaded && existing) {
      setForm({ from_email: existing.from_email || '', from_name: existing.from_name || '' });
      setLoaded(true);
    }
  }, [existing, loaded]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Store minimal info — smtp fields not needed for Resend routing
      const payload = {
        from_email: data.from_email,
        from_name: data.from_name,
        smtp_host: 'resend',
        smtp_port: 587,
        smtp_username: data.from_email,
        smtp_password: 'via-resend-api',
      };
      if (existing) return db.entities.WorkspaceEmailSettings.update(existing.id, payload);
      return db.entities.WorkspaceEmailSettings.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaceEmailSettings'] });
      toast.success('Sender identity saved');
    },
    onError: (err) => toast.error('Failed to save: ' + err.message),
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.from_email) { toast.error('From email is required'); return; }
    saveMutation.mutate(form);
  };

  const handleTest = async () => {
    if (!testEmail) { toast.error('Enter a test recipient email'); return; }
    setTesting(true);
    try {
      const res = await db.functions.invoke('sendSmtpEmail', {
        to: testEmail,
        subject: 'Port 24 — Email Test',
        body: `<p style="font-family:sans-serif">This is a test email from <strong>Port 24</strong>.<br/>Your sender identity is working correctly!</p>`,
      });
      if (res.data?.success) {
        toast.success(`Test email sent to ${testEmail}`);
        if (existing) {
          await db.entities.WorkspaceEmailSettings.update(existing.id, {
            is_verified: true,
            last_tested_at: new Date().toISOString(),
          });
          queryClient.invalidateQueries({ queryKey: ['workspaceEmailSettings'] });
        }
      } else {
        toast.error('Test failed: ' + (res.data?.error || 'Unknown error'));
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('not verified') || msg.includes('domain')) {
        toast.error('Domain not verified — add & verify your domain at resend.com/domains first', { duration: 8000 });
      } else {
        toast.error('Test failed: ' + msg);
      }
    }
    setTesting(false);
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Status banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${existing?.is_verified ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
        {existing?.is_verified
          ? <><CheckCircle2 className="w-4 h-4 shrink-0" /><span className="text-sm font-medium">Email verified — sending from <strong>{existing.from_email}</strong></span></>
          : <><AlertCircle className="w-4 h-4 shrink-0" /><span className="text-sm font-medium">{existing ? 'Sender configured but not yet verified — send a test email below' : 'No sender configured — using default Port 24 email service'}</span></>
        }
      </div>

      {/* Info card */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        <p>Emails are sent via <strong className="text-foreground">Resend</strong>. To send from your own domain (e.g. <em>info@nedm.com</em>), you must first <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary underline">verify your domain on resend.com/domains</a>. Until then, use a verified Resend sender address.</p>
      </div>

      {/* Sender Identity Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Sender Identity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>From Email *</Label>
              <Input
                type="email"
                value={form.from_email}
                onChange={e => setForm(f => ({ ...f, from_email: e.target.value }))}
                placeholder="info@yourcompany.com"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">The "From" address recipients will see on all outgoing emails.</p>
            </div>
            <div>
              <Label>From Name</Label>
              <Input
                value={form.from_name}
                onChange={e => setForm(f => ({ ...f, from_name: e.target.value }))}
                placeholder="NEDM Productions"
              />
              <p className="text-xs text-muted-foreground mt-1">Display name shown in the inbox (e.g. "NEDM Productions").</p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saveMutation.isPending} className="w-full">
          {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Sender Identity'}
        </Button>
      </form>

      {/* Test send */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Send Test Email</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="recipient@example.com"
            />
            <Button type="button" variant="outline" onClick={handleTest} disabled={testing} className="shrink-0">
              {testing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Mail className="w-4 h-4 mr-1" />}
              {testing ? 'Sending...' : 'Send Test'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Sends a test email to verify your sender configuration is working.</p>
        </CardContent>
      </Card>
    </div>
  );
}