import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { User, Phone, Mail, Briefcase, Package, Save, Upload, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import EmployeeCheckoutPanel from '@/components/employee/EmployeeCheckoutPanel';

export default function MyProfile() {
  const { userRecord } = useAuth();
  const queryClient = useQueryClient();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Find the crew member record linked to the current user
  const { data: crewList = [], isLoading } = useQuery({
    queryKey: ['myCrewProfile', userRecord?.id],
    queryFn: () => base44.entities.CrewMember.filter({ user_id: userRecord?.id }),
    enabled: !!userRecord?.id,
  });

  const crewMember = crewList[0];

  const [form, setForm] = useState(null);

  // Initialize form when crewMember loads
  React.useEffect(() => {
    if (crewMember && !form) {
      setForm({
        phone_number: crewMember.phone_number || '',
        job_title: crewMember.job_title || '',
        department: crewMember.department || '',
        skills: crewMember.skills || '',
        emergency_contact: crewMember.emergency_contact || '',
        notes: crewMember.notes || '',
        profile_photo_url: crewMember.profile_photo_url || '',
      });
    }
  }, [crewMember]);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.CrewMember.update(crewMember.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCrewProfile'] });
      toast.success('Profile saved');
    },
    onError: () => toast.error('Failed to save'),
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, profile_photo_url: file_url }));
    setUploadingPhoto(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading profile…</div>;
  }

  if (!crewMember) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-3">
        <User className="w-12 h-12 mx-auto text-muted-foreground/30" />
        <p className="font-medium">No employee profile found</p>
        <p className="text-sm text-muted-foreground">
          Ask your admin to create a Crew Member profile linked to your account.
        </p>
      </div>
    );
  }

  const displayName = userRecord?.full_name || userRecord?.email || 'You';

  return (
    <div className="max-w-2xl">
      <PageHeader title="My Profile" description="Your personal employee profile and checked-out equipment" />

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile"><User className="w-3.5 h-3.5 mr-1.5" /> Profile</TabsTrigger>
          <TabsTrigger value="equipment"><Package className="w-3.5 h-3.5 mr-1.5" /> My Equipment</TabsTrigger>
        </TabsList>

        {/* ── Profile tab ── */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Personal Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Photo + name row */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted border flex items-center justify-center overflow-hidden shrink-0">
                  {form?.profile_photo_url
                    ? <img src={form.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                    : <User className="w-7 h-7 text-muted-foreground" />
                  }
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{displayName}</p>
                  <p className="text-sm text-muted-foreground">{userRecord?.email}</p>
                  <Badge variant="outline" className="capitalize mt-1 text-xs">{userRecord?.role || 'crew'}</Badge>
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  <Button variant="outline" size="sm" disabled={uploadingPhoto} asChild>
                    <span>{uploadingPhoto ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Uploading</> : <><Upload className="w-3.5 h-3.5 mr-1.5" />Photo</>}</span>
                  </Button>
                </label>
              </div>

              {form && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={form.phone_number}
                      onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label>Job Title</Label>
                    <Input
                      value={form.job_title}
                      onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))}
                      placeholder="e.g. Senior Audio Tech"
                    />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input
                      value={form.department}
                      onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                      placeholder="e.g. Audio, Video, Lighting"
                    />
                  </div>
                  <div>
                    <Label>Emergency Contact</Label>
                    <Input
                      value={form.emergency_contact}
                      onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))}
                      placeholder="Name and phone number"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Skills (comma-separated)</Label>
                    <Input
                      value={form.skills}
                      onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
                      placeholder="e.g. A1, Rigging, Lighting, Stage Setup"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Anything else…"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending || !form}
          >
            <Save className="w-4 h-4 mr-1.5" />
            {saveMutation.isPending ? 'Saving…' : 'Save Profile'}
          </Button>
        </TabsContent>

        {/* ── Equipment tab ── */}
        <TabsContent value="equipment">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" /> My Checked-Out Equipment
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Scan or enter an exact Asset ID to check out equipment for personal use. Checked-out assets are reserved to you and cannot be booked on projects until returned.
              </p>
            </CardHeader>
            <CardContent>
              <EmployeeCheckoutPanel crewMember={crewMember} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}