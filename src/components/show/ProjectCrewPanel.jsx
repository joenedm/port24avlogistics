import React, { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import BillableValidationDialog from './BillableValidationDialog';
import CrewInviteWorkflow from '@/components/email/CrewInviteWorkflow';
import ProjectCrewCard from './ProjectCrewCard';
import { calculateCrewCost, getPricingMethodLabel } from '@/lib/crewRoleCalculations';

const DEPARTMENTS = [
  'Audio', 'Video', 'Lighting', 'Grip', 'Electric', 'Stage', 'Production', 'Direction', 'Post-Production', 'Other'
];

export default function ProjectCrewPanel({ showId, show }) {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCrew, setEditingCrew] = useState(null);
  const [billableDialog, setBillableDialog] = useState(null);
  const [customRoleMode, setCustomRoleMode] = useState(false);
  const [projectOnlyRoles, setProjectOnlyRoles] = useState([]);
  const [inviteWorkflowOpen, setInviteWorkflowOpen] = useState(false);
  const [inviteCrewId, setInviteCrewId] = useState(null);
  const [formData, setFormData] = useState({
    role: '',
    role_id: '',
    crew_member_name: '',
    assignment_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    hours: 0,
    days: 1,
    quantity: 1,
    notes: '',
  });

  const { data: projectCrew = [] } = useQuery({
    queryKey: ['projectCrew', showId],
    queryFn: () => db.entities.ProjectCrew.filter({ show_id: showId })
  });

  // Fetch all CrewBookings for this show so we can show invite status per person
  const { data: showBookings = [] } = useQuery({
    queryKey: ['crewBookings', showId],
    queryFn: () => db.entities.CrewBooking.filter({ show_id: showId }),
  });

  // Quick lookup: projectCrewId -> CrewBooking
  const bookingByProjectCrewId = React.useMemo(() => {
    const map = {};
    showBookings.forEach(b => {
      if (b.project_crew_id) map[b.project_crew_id] = b;
    });
    return map;
  }, [showBookings]);

  const { data: crewRoles = [] } = useQuery({
    queryKey: ['crewRoles'],
    queryFn: () => db.entities.CrewRole.list()
  });

  const { data: crewMembers = [] } = useQuery({
    queryKey: ['crewMembers'],
    queryFn: () => db.entities.CrewMember.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => db.entities.User.list()
  });

  const createCrewMutation = useMutation({
    mutationFn: async (data) => {
      const role = [...crewRoles, ...projectOnlyRoles].find(r => r.id === data.role_id);
      if (!role) return Promise.reject('Role not found');

      const { internal, billable } = calculateCrewCost(role, data.quantity, {
        internal_rate: data.internal_rate || undefined,
        billable_rate: data.billable_rate || undefined,
      });

      const hours = data.pricing_method === 'hourly' && data.start_time && data.end_time 
        ? calculateHours(data.start_time, data.end_time) 
        : 0;

      const multiplier = data.pricing_method === 'hourly' ? hours : data.pricing_method === 'days' ? data.days : 1;
      const finalInternal = (internal || 0) * multiplier;
      const finalBillable = (billable || 0) * multiplier;

      // Treat 'tbd' selection as unassigned
      const isTBDSelection = !data.crew_member_name || data.crew_member_name === 'tbd';
      const crewMember = isTBDSelection ? null : crewMembers.find(c => c.user_id === data.crew_member_name);
      const user = isTBDSelection ? null : users.find(u => u.id === data.crew_member_name);

      // Create ProjectCrew
      const projectCrew = await db.entities.ProjectCrew.create({
        show_id: showId,
        show_name: show?.name,
        crew_member_name: isTBDSelection ? '' : data.crew_member_name,
        crew_member_email: crewMember?.email || user?.email || '',
        role: data.role,
        assignment_date: data.assignment_date,
        start_time: data.start_time,
        end_time: data.end_time,
        hours,
        quantity: data.quantity,
        rate_type: data.pricing_method === 'hourly' ? 'hourly' : data.pricing_method === 'days' ? 'daily' : 'fixed',
        internal_cost: finalInternal,
        billable_cost: finalBillable,
        internal_rate: internal,
        billable_rate: billable,
        labor_rate_id: role.id,
        notes: data.notes,
        assignment_status: 'not_sent',
        billable_rate_missing: !billable,
      });

      // Auto-create linked CrewBooking — only if a real person is assigned
      const crewMemberRecord = isTBDSelection ? null : crewMembers.find(c => c.user_id === data.crew_member_name);
      if (crewMemberRecord) {
        const newBooking = await db.entities.CrewBooking.create({
          show_id: showId,
          show_name: show?.name,
          crew_id: crewMemberRecord.id,
          crew_name: user?.full_name || data.crew_member_name,
          crew_email: crewMember?.email || user?.email,
          crew_phone: crewMember?.phone_number,
          project_crew_id: projectCrew.id,
          role: data.role,
          status: 'not_sent',
          attached_at: new Date().toISOString(),
          start_date: data.assignment_date || show?.start_date,
          end_date: data.end_date || show?.end_date || '',
          start_time: data.start_time,
          end_time: data.end_time,
          location: show?.venue || '',
          rate: finalBillable || finalInternal,
          rate_type: data.pricing_method === 'hourly' ? 'hourly' : data.pricing_method === 'days' ? 'daily' : 'fixed',
          notes: data.notes,
          billable_rate_missing: !billable,
        });

        // Link the CrewBooking back to ProjectCrew
        await db.entities.ProjectCrew.update(projectCrew.id, {
          crew_booking_id: newBooking.id,
        });
      }

      return projectCrew;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectCrew', showId] });
      queryClient.invalidateQueries({ queryKey: ['crewBookings'] });
      resetForm();
      setOpenDialog(false);
      setCustomRoleMode(false);
    }
  });

  const updateCrewMutation = useMutation({
    mutationFn: (data) => db.entities.ProjectCrew.update(editingCrew.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectCrew', showId] });
      resetForm();
      setOpenDialog(false);
    }
  });

  const deleteCrewMutation = useMutation({
    mutationFn: (id) => db.entities.ProjectCrew.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projectCrew', showId] })
  });

  const calculateHours = (start, end) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em - sh * 60 - sm) / 60;
  };

  const handleRoleSelect = (roleId) => {
    const role = crewRoles.find(r => r.id === roleId);
    if (!role) return;

    // Allow selection even if billable rate is missing (will warn, not block)
    setFormData({
      ...formData,
      role: role.role_name,
      role_id: role.id,
      pricing_method: role.pricing_method,
      internal_rate: role.pricing_method === 'hourly' ? role.hourly_rate_internal : role.pricing_method === 'fixed' ? role.fixed_cost_internal : role.daily_rate_internal,
      billable_rate: role.pricing_method === 'hourly' ? role.hourly_rate_billable : role.pricing_method === 'fixed' ? role.fixed_cost_billable : role.daily_rate_billable,
    });
  };

  const handleAddCustomRole = (customRole) => {
    const newRole = { ...customRole, id: `custom-${Date.now()}` };
    setProjectOnlyRoles([...projectOnlyRoles, newRole]);
    setFormData({
      ...formData,
      role: customRole.role_name,
      role_id: newRole.id,
      pricing_method: customRole.pricing_method,
      internal_rate: customRole.internal_rate,
      billable_rate: customRole.billable_rate,
    });
    setCustomRoleMode(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingCrew) {
      updateCrewMutation.mutate(formData);
    } else {
      createCrewMutation.mutate(formData);
    }
  };

  const resetForm = () => {
    setEditingCrew(null);
    setFormData({
      role: '',
      role_id: '',
      crew_member_name: '',
      assignment_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      hours: 0,
      days: 1,
      quantity: 1,
      notes: '',
    });
  };

  const totalInternalCost = projectCrew.reduce((sum, c) => sum + (parseFloat(c.internal_cost) || 0), 0);
  const totalBillableCost = projectCrew.reduce((sum, c) => sum + (parseFloat(c.billable_cost) || 0), 0);
  const margin = totalBillableCost - totalInternalCost;

  const allRoles = crewRoles.filter(r => r.is_active).concat(projectOnlyRoles);

  const isTBD = (crew) => !crew.crew_member_name || crew.crew_member_name.trim().toLowerCase() === 'tbd';

  const handleInviteCrew = async (crew) => {
    // Block invites for TBD / unassigned positions
    if (isTBD(crew)) {
      alert('This position has no crew member assigned yet. Please assign a crew member before sending an invite.');
      return;
    }

    // Check if crew member has email
    const crewMember = crewMembers.find(c => c.user_id === crew.crew_member_name);
    const user = users.find(u => u.id === crew.crew_member_name);
    const email = crewMember?.email || user?.email;

    if (!email) {
      alert(`No email found for this crew member. Please add an email address first.`);
      return;
    }

    try {
      console.log('📌 Project crew selected:', crew.id, crew.role);

      let crewBookingId = crew.crew_booking_id;

      // If no CrewBooking exists, create one
      if (!crewBookingId) {
        console.log('📌 Creating linked CrewBooking for ProjectCrew:', crew.id);

        const newBooking = await db.entities.CrewBooking.create({
          show_id: showId,
          show_name: show?.name,
          crew_id: crewMember?.id,
          crew_name: user?.full_name || crew.crew_member_name,
          crew_email: email,
          crew_phone: crewMember?.phone_number,
          project_crew_id: crew.id,
          role: crew.role,
          status: 'not_sent',
          attached_at: new Date().toISOString(),
          start_date: show?.start_date || crew.assignment_date,
          end_date: show?.end_date || '',
          start_time: crew.start_time,
          end_time: crew.end_time,
          location: show?.venue || '',
          rate: crew.billable_rate || crew.internal_rate,
          rate_type: crew.rate_type || 'fixed',
          notes: crew.notes,
          billable_rate_missing: crew.billable_rate_missing,
        });

        crewBookingId = newBooking.id;
        console.log('✅ CrewBooking created:', crewBookingId);

        // Update ProjectCrew with the booking ID
        await db.entities.ProjectCrew.update(crew.id, {
          crew_booking_id: crewBookingId,
        });
        console.log('✅ ProjectCrew updated with CrewBooking ID:', crewBookingId);

        // Invalidate queries to reflect changes
        queryClient.invalidateQueries({ queryKey: ['projectCrew', showId] });
        queryClient.invalidateQueries({ queryKey: ['crewBookings'] });
      } else {
        // Update existing CrewBooking with latest data
        console.log('📌 Updating existing CrewBooking:', crewBookingId);
        await db.entities.CrewBooking.update(crewBookingId, {
          role: crew.role,
          start_date: show?.start_date || crew.assignment_date,
          end_date: show?.end_date || '',
          start_time: crew.start_time,
          end_time: crew.end_time,
          location: show?.venue || '',
          rate: crew.billable_rate || crew.internal_rate,
          rate_type: crew.rate_type || 'fixed',
          notes: crew.notes,
        });
        console.log('✅ CrewBooking updated:', crewBookingId);
      }

      console.log('📌 Opening invite workflow with CrewBooking ID:', crewBookingId);
      setInviteCrewId(crew.id);
      setInviteWorkflowOpen(true);
    } catch (error) {
      console.error('❌ Error creating/updating CrewBooking:', error);
      alert(`Failed to create crew booking: ${error.message}`);
    }
  };

  const invitingCrew = projectCrew.find(c => c.id === inviteCrewId);
  const crewMember = crewMembers.find(c => c.user_id === invitingCrew?.crew_member_name);
  const user = users.find(u => u.id === invitingCrew?.crew_member_name);
  const crewEmail = crewMember?.email || user?.email;

  // Build crew data for invite workflow (for display purposes)
  const crewInviteData = invitingCrew ? {
    id: invitingCrew.id,
    show_id: showId,
    show_name: show?.name,
    crew_name: invitingCrew.crew_member_name ? (user?.full_name || invitingCrew.crew_member_name) : '',
    role: invitingCrew.role,
    assignment_date: invitingCrew.assignment_date,
    start_time: invitingCrew.start_time,
    end_time: invitingCrew.end_time,
    location: show?.venue || '',
    rate: invitingCrew.billable_rate,
    rate_type: invitingCrew.rate_type || 'fixed',
  } : null;

  // The CrewBooking ID is already created and saved in handleInviteCrew
  const crewBookingIdForWorkflow = invitingCrew?.crew_booking_id;

  return (
    <div className="space-y-4">
      {billableDialog && (
        <BillableValidationDialog
          role={billableDialog.role}
          onSaveAndContinue={(updatedRole) => {
            // Update role with billable amount
            db.entities.CrewRole.update(billableDialog.role.id, {
              hourly_rate_billable: billableDialog.role.pricing_method === 'hourly' ? updatedRole.billable_rate : billableDialog.role.hourly_rate_billable,
              fixed_cost_billable: billableDialog.role.pricing_method === 'fixed' ? updatedRole.billable_rate : billableDialog.role.fixed_cost_billable,
              daily_rate_billable: billableDialog.role.pricing_method === 'days' ? updatedRole.billable_rate : billableDialog.role.daily_rate_billable,
            }).then(() => {
              queryClient.invalidateQueries({ queryKey: ['crewRoles'] });
              setBillableDialog(null);
              handleRoleSelect(billableDialog.role.id);
            });
          }}
          onCancel={() => setBillableDialog(null)}
        />
      )}

      {inviteWorkflowOpen && crewInviteData && (
        <CrewInviteWorkflow
          open={inviteWorkflowOpen}
          onOpenChange={setInviteWorkflowOpen}
          crewBookingData={crewInviteData}
          crewBookingId={crewBookingIdForWorkflow}
          recipientEmail={crewEmail}
          showData={show}
        />
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Crew Assignments</h3>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => {
              resetForm();
              if (show?.start_date) {
                setFormData(prev => ({ ...prev, assignment_date: show.start_date, end_date: show.end_date || show.start_date }));
              }
            }}>
              <Plus className="w-4 h-4 mr-1" /> Add Crew
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCrew ? 'Edit Crew' : 'Assign Crew'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!customRoleMode ? (
                <>
                  <div>
                    <Label>Role *</Label>
                    <Select value={formData.role_id} onValueChange={handleRoleSelect}>
                      <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>
                        {allRoles.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.role_name} {projectOnlyRoles.find(r => r.id === role.id) && <Badge className="ml-2 text-xs">Project Only</Badge>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setCustomRoleMode(true)}
                  >
                    + Add Custom Role (Project Only)
                  </Button>
                </>
              ) : (
                <CustomRoleForm
                  onSave={handleAddCustomRole}
                  onCancel={() => setCustomRoleMode(false)}
                  departments={DEPARTMENTS}
                />
              )}

              {formData.role_id && (
                <>
                  <Select value={formData.crew_member_name || ''} onValueChange={(v) => setFormData({ ...formData, crew_member_name: v === 'tbd' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select crew member (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tbd">TBD (unassigned)</SelectItem>
                      {crewMembers.map(member => {
                        const user = users.find(u => u.id === member.user_id);
                        return (
                          <SelectItem key={member.id} value={member.user_id || member.id}>
                            {user?.full_name || member.user_id}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">From Date *</Label>
                      <Input
                        type="date"
                        value={formData.assignment_date}
                        onChange={(e) => setFormData({ ...formData, assignment_date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">To Date *</Label>
                      <Input
                        type="date"
                        value={formData.end_date || ''}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {formData.pricing_method === 'hourly' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      />
                      <Input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      />
                    </div>
                  )}

                  {formData.pricing_method === 'days' && (
                    <Input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={formData.days}
                      onChange={(e) => setFormData({ ...formData, days: parseFloat(e.target.value) })}
                      placeholder="Number of days"
                    />
                  )}



                  <Input
                    placeholder="Notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setOpenDialog(false); setCustomRoleMode(false); }}>Cancel</Button>
                <Button type="submit" disabled={!formData.role_id}>Save</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {projectCrew.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No crew assigned yet</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Internal Cost</p>
              <p className="text-2xl font-bold">${totalInternalCost.toFixed(2)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Billable Total</p>
              <p className="text-2xl font-bold">${totalBillableCost.toFixed(2)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Margin</p>
              <p className="text-2xl font-bold text-accent">${margin.toFixed(2)}</p>
            </Card>
          </div>

          <div className="space-y-2">
            {projectCrew.map(crew => {
              const booking = bookingByProjectCrewId[crew.id];
              const isTBDCrew = isTBD(crew);
              const personName = isTBDCrew
                ? null
                : (users.find(u => u.id === crew.crew_member_name)?.full_name || crew.crew_member_name);

              return (
                <ProjectCrewCard
                  key={crew.id}
                  crew={crew}
                  booking={booking}
                  show={show}
                  personName={personName}
                  isTBD={isTBDCrew}
                  onInvite={handleInviteCrew}
                  onEdit={(c) => { setEditingCrew(c); setFormData(c); setOpenDialog(true); }}
                  onDelete={(id) => deleteCrewMutation.mutate(id)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function CustomRoleForm({ onSave, onCancel, departments }) {
  const [form, setForm] = useState({
    role_name: '',
    department: 'Audio',
    pricing_method: 'hourly',
    internal_rate: 0,
    billable_rate: 0,
    notes: '',
  });

  const handleSave = () => {
    if (!form.role_name || !form.billable_rate) {
      alert('Role name and billable rate are required');
      return;
    }
    onSave(form);
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <AlertCircle className="w-4 h-4 text-blue-600" />
        <p className="text-sm text-blue-700">This role will only apply to this project</p>
      </div>

      <div>
        <Label>Role Name *</Label>
        <Input
          value={form.role_name}
          onChange={(e) => setForm({ ...form, role_name: e.target.value })}
          placeholder="e.g. Lead Tech, VIP Handler"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Department</Label>
          <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Pricing Method</Label>
          <Select value={form.pricing_method} onValueChange={(v) => setForm({ ...form, pricing_method: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="fixed">Fixed</SelectItem>
              <SelectItem value="days">Days @ Price</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Internal Cost Rate</Label>
          <Input
            type="number"
            value={form.internal_rate}
            onChange={(e) => setForm({ ...form, internal_rate: parseFloat(e.target.value) })}
            step="0.01"
            min="0"
          />
        </div>

        <div>
          <Label>Billable Rate *</Label>
          <Input
            type="number"
            value={form.billable_rate}
            onChange={(e) => setForm({ ...form, billable_rate: parseFloat(e.target.value) })}
            step="0.01"
            min="0"
            required
          />
        </div>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Project-specific notes..."
          className="h-16"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave}>Create Custom Role</Button>
      </div>
    </div>
  );
}