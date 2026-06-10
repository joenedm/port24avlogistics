import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle, XCircle, UserCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ROLES = ['crew', 'coordinator', 'manager', 'director', 'admin'];

export default function PendingUsersPanel() {
  const queryClient = useQueryClient();
  const [approveRoles, setApproveRoles] = useState({});

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const pendingUsers = users.filter(u => u.status === 'pending');

  const approveMutation = useMutation({
    mutationFn: ({ id, role }) =>
      base44.entities.User.update(id, { status: 'approved', role, onboarding_complete: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => base44.entities.User.update(id, { status: 'rejected' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  if (pendingUsers.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" /> Pending Approvals</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">No pending access requests.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          Pending Approvals
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 ml-1">{pendingUsers.length}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Assign a role and approve or reject each request.</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name / Email</TableHead>
              <TableHead className="hidden md:table-cell">Company</TableHead>
              <TableHead>Assign Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingUsers.map(u => (
              <TableRow key={u.id}>
                <TableCell>
                  <p className="font-medium">{u.full_name || '—'}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{u.company || '—'}</TableCell>
                <TableCell>
                  <Select
                    value={approveRoles[u.id] || 'crew'}
                    onValueChange={v => setApproveRoles(r => ({ ...r, [u.id]: v }))}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => (
                        <SelectItem key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      onClick={() => approveMutation.mutate({ id: u.id, role: approveRoles[u.id] || 'crew' })}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                      onClick={() => rejectMutation.mutate(u.id)}
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}