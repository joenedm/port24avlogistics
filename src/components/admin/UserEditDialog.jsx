import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Mail, CheckCircle, XCircle, KeyRound, Loader2, ExternalLink } from 'lucide-react';

const STATUS_COLORS = {
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
  inactive: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

export default function UserEditDialog({ user, open, onOpenChange, allUsers }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({});
  const [resetSent, setResetSent] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkGenerated, setLinkGenerated] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        company: user.company || '',
        role: user.role || 'crew',
        status: user.status || 'approved',
        notes: user.notes || '',
      });
      setResetSent(false);
      setLinkGenerated(false);
    }
  }, [user]);

  const adminCount = allUsers.filter(u => u.role === 'admin').length;
  const isLastAdmin = user?.role === 'admin' && adminCount === 1;

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.User.update(user.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated');
      onOpenChange(false);
    },
  });

  const handleSave = () => {
    if (isLastAdmin && form.role !== 'admin') {
      toast.error('Cannot remove the last admin.');
      return;
    }
    const data = { ...form };
    if (form.status === 'approved' && user.status !== 'approved') {
      data.approval_date = new Date().toISOString();
    }
    updateMutation.mutate(data);
  };

  const handleApprove = () => updateMutation.mutate({ status: 'approved', approval_date: new Date().toISOString() });
  const handleReject = () => updateMutation.mutate({ status: 'rejected' });

  const handleGenerateResetLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await base44.functions.invoke('adminSetUserPassword', { email: user.email });
      const { reset_url } = res.data;
      window.open(reset_url, '_blank');
      setLinkGenerated(true);
      toast.success('Reset link opened in a new tab');
    } catch (err) {
      toast.error('Failed to generate reset link: ' + err.message);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handlePasswordReset = async () => {
    setResettingPassword(true);
    try {
      await base44.auth.resetPasswordRequest(user.email);
      setResetSent(true);
      toast.success('Password reset email sent to ' + user.email);
    } catch (err) {
      toast.error('Failed to send reset email: ' + err.message);
    } finally {
      setResettingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Full name" />
            </div>
            <div>
              <Label>Company</Label>
              <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="coordinator">Coordinator</SelectItem>
                  <SelectItem value="crew">Crew</SelectItem>
                </SelectContent>
              </Select>
              {isLastAdmin && form.role !== 'admin' && (
                <p className="text-xs text-destructive mt-1">Cannot remove last admin.</p>
              )}
            </div>
            <div className="col-span-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Admin Notes</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes..." />
            </div>
          </div>

          <Separator />

          {/* Password Reset */}
          <div>
            <Label className="flex items-center gap-1.5 mb-2"><KeyRound className="w-3.5 h-3.5" /> Password Reset</Label>

            {/* Admin-generated reset link */}
            <p className="text-xs text-muted-foreground mb-2">Generate a reset link and complete the password change yourself in a new tab.</p>
            <Button type="button" size="sm" onClick={handleGenerateResetLink} disabled={generatingLink} className="gap-2 mb-4">
              {generatingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : linkGenerated ? <CheckCircle className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
              {generatingLink ? 'Generating...' : linkGenerated ? 'Link Opened' : 'Open Reset Page'}
            </Button>

            {/* Email reset */}
            <p className="text-xs text-muted-foreground mb-2">Or send a reset link to the user's email.</p>
            <Button type="button" variant="outline" size="sm" onClick={handlePasswordReset} disabled={resettingPassword || resetSent} className="gap-2">
              {resettingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : resetSent ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Mail className="w-4 h-4" />}
              {resettingPassword ? 'Sending...' : resetSent ? 'Reset Email Sent' : 'Send Password Reset Email'}
            </Button>
          </div>

          {user.status === 'pending' && (
            <>
              <Separator />
              <div>
                <Label className="mb-2 block">Approval Actions</Label>
                <div className="flex gap-2">
                  <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApprove}>
                    <CheckCircle className="w-4 h-4" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-2" onClick={handleReject}>
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                </div>
              </div>
            </>
          )}

          <div className="text-xs text-muted-foreground space-y-1 border rounded-lg p-3 bg-muted/30">
            <p><span className="font-medium">Email:</span> {user.email}</p>
            <p><span className="font-medium">Member since:</span> {user.created_date ? new Date(user.created_date).toLocaleDateString() : '—'}</p>
            <p><span className="font-medium">Status:</span> <span className={`inline-block px-1.5 rounded text-xs border ${STATUS_COLORS[user.status] || STATUS_COLORS.approved}`}>{user.status || 'approved'}</span></p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}