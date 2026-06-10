import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import HeaderImageUpload from '@/components/email/HeaderImageUpload';

const DEFAULT_FIELDS = [
  { field_name: 'project_name', display_label: 'Project Name' },
  { field_name: 'crew_name', display_label: 'Crew Member' },
  { field_name: 'role', display_label: 'Role' },
  { field_name: 'date', display_label: 'Date' },
  { field_name: 'start_time', display_label: 'Start Time' },
  { field_name: 'end_time', display_label: 'End Time' },
  { field_name: 'location', display_label: 'Location' },
  { field_name: 'cost', display_label: 'Pay' },
];

export default function EmailBuilder() {
  const [formData, setFormData] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [showTestInput, setShowTestInput] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const queryClient = useQueryClient();

  // Fetch brand settings
  const { data: brandSettings = [] } = useQuery({
    queryKey: ['brandSettings'],
    queryFn: () => db.entities.BrandSettings.list()
  });

  // Fetch field controls
  const { data: fieldControls = [] } = useQuery({
    queryKey: ['emailFieldControls'],
    queryFn: () => db.entities.EmailFieldControl.list()
  });

  const brand = brandSettings[0] || {};

  // Initialize form data and missing fields
  useEffect(() => {
    if (brand) {
      setFormData(brand);
    }
  }, [brand]);

  // Create missing field controls once on mount
  useEffect(() => {
    if (fieldControls.length === 0) return;
    const existingFields = fieldControls.map(f => f.field_name);
    const missingFields = DEFAULT_FIELDS.filter(f => !existingFields.includes(f.field_name));
    if (missingFields.length > 0) {
      db.entities.EmailFieldControl.bulkCreate(
        missingFields.map(field => ({
          field_name: field.field_name,
          display_label: field.display_label,
          is_visible: true
        }))
      ).then(() => queryClient.invalidateQueries({ queryKey: ['emailFieldControls'] }));
    }
  }, [fieldControls.length]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const result = brand.id
        ? await db.entities.BrandSettings.update(brand.id, data)
        : await db.entities.BrandSettings.create(data);

      const templates = await db.entities.EmailTemplate.filter({ template_type: 'crew_assignment' });
      if (templates.length === 0) {
        await db.entities.EmailTemplate.create({
          template_name: 'Default Crew Assignment',
          subject_line: 'Crew Assignment - {{project_name}}',
          template_type: 'crew_assignment',
          header_enabled: true,
          footer_enabled: true,
          sections: [],
          is_active: true
        });
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandSettings'] });
      alert('Email builder saved successfully!');
    }
  });

  const fieldUpdateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.EmailFieldControl.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emailFieldControls'] })
  });

  const sendTestMutation = useMutation({
    mutationFn: (data) => db.functions.invoke('sendTestEmail', data),
    onSuccess: () => {
      setShowTestInput(false);
      setTestEmail('');
      alert('Test email sent successfully!');
    },
    onError: (error) => alert('Failed to send test email: ' + error.message)
  });

  const handleFileUpload = async (file, fieldName) => {
    try {
      setUploadProgress(50);
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      setUploadProgress(100);
      setFormData({ ...formData, [fieldName]: file_url });
      setTimeout(() => setUploadProgress(0), 1000);
    } catch (error) {
      alert('Upload failed: ' + error.message);
    }
  };

  const toggleField = (field) => {
    if (!field.id) {
      db.entities.EmailFieldControl.create({
        field_name: field.field_name,
        display_label: field.display_label,
        is_visible: !field.is_visible
      }).then(() => queryClient.invalidateQueries({ queryKey: ['emailFieldControls'] }));
    } else {
      fieldUpdateMutation.mutate({ id: field.id, data: { is_visible: !field.is_visible } });
    }
  };

  const displayFields = (fieldControls.length > 0 ? fieldControls : DEFAULT_FIELDS.map(f => ({ ...f, is_visible: true })))
    .filter(f => DEFAULT_FIELDS.some(df => df.field_name === f.field_name))
    .reduce((acc, field) => {
      if (!acc.find(f => f.field_name === field.field_name)) acc.push(field);
      return acc;
    }, []);

  const handleSendTest = () => {
    if (!testEmail) {
      alert('Please enter an email address');
      return;
    }
    sendTestMutation.mutate({
      branding: formData,
      visibleFields: displayFields.filter(f => f.is_visible !== false).map(f => f.field_name),
      testEmail
    });
  };

  if (!formData) {
    return <div className="flex items-center justify-center p-8"><p>Loading...</p></div>;
  }

  const visibleFieldsList = displayFields.filter(f => f.is_visible !== false).map(f => f.field_name);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Email Builder" description="Design, configure, and test crew assignment emails in one place" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT SIDE: Configuration */}
        <div className="space-y-6">
          {/* HEADER SETTINGS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Header Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Company Logo</Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'email_header_logo_url')}
                  />
                </div>
                {formData.email_header_logo_url && (
                  <img src={formData.email_header_logo_url} alt="Logo" className="h-12 mt-2" />
                )}
              </div>

              <div>
                <Label>Background Type</Label>
                <Select
                  value={formData.email_header_background_type || 'solid'}
                  onValueChange={(v) => setFormData({ ...formData, email_header_background_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid Color</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.email_header_background_type === 'solid' && (
                <div>
                  <Label>Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.email_header_background_color || '#2563eb'}
                      onChange={(e) => setFormData({ ...formData, email_header_background_color: e.target.value })}
                      className="h-10 w-20"
                    />
                  </div>
                </div>
              )}

              {formData.email_header_background_type === 'image' && (
                <HeaderImageUpload
                  value={formData.email_header_background_url}
                  onChange={(url) => setFormData({ ...formData, email_header_background_url: url })}
                />
              )}

              {formData.email_header_background_type === 'gradient' && (
                <div>
                  <Label>Gradient</Label>
                  <Input
                    type="text"
                    value={formData.email_header_background_gradient || 'linear-gradient(to right, #2563eb, #06b6d4)'}
                    onChange={(e) => setFormData({ ...formData, email_header_background_gradient: e.target.value })}
                    placeholder="e.g., linear-gradient(to right, #2563eb, #06b6d4)"
                  />
                </div>
              )}

              <div>
                <Label>Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.email_header_text_color || '#ffffff'}
                    onChange={(e) => setFormData({ ...formData, email_header_text_color: e.target.value })}
                    className="h-10 w-20"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.email_header_show_logo !== false}
                  onChange={(e) => setFormData({ ...formData, email_header_show_logo: e.target.checked })}
                />
                <span className="text-sm">Show Logo</span>
              </label>
            </CardContent>
          </Card>

          {/* FOOTER SETTINGS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Footer Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Company Email</Label>
                <Input
                  type="email"
                  value={formData.company_email || ''}
                  onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                  placeholder="contact@company.com"
                />
              </div>

              <div>
                <Label>Company Phone</Label>
                <Input
                  value={formData.company_phone || ''}
                  onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label>Footer Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.email_footer_background_color || '#f9fafb'}
                    onChange={(e) => setFormData({ ...formData, email_footer_background_color: e.target.value })}
                    className="h-10 w-20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={formData.email_footer_show_company_name !== false}
                    onChange={(e) => setFormData({ ...formData, email_footer_show_company_name: e.target.checked })}
                  />
                  <span>Show Company Name</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={formData.email_footer_show_phone !== false}
                    onChange={(e) => setFormData({ ...formData, email_footer_show_phone: e.target.checked })}
                  />
                  <span>Show Phone</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={formData.email_footer_show_email !== false}
                    onChange={(e) => setFormData({ ...formData, email_footer_show_email: e.target.checked })}
                  />
                  <span>Show Email</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* FIELD SELECTION */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Body Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Choose which fields to display in emails.</p>
              <div className="space-y-2">
                {displayFields.map((field) => (
                  <label key={field.field_name} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.is_visible !== false}
                      onChange={() => toggleField(field)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">{field.display_label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDE: Live Preview & Actions */}
        <div className="space-y-6">
          {/* LIVE PREVIEW */}
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Live Email Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <GmailCompatiblePreview branding={formData} visibleFields={visibleFieldsList} />
            </CardContent>
          </Card>

          {/* ACTIONS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!showTestInput ? (
                <Button
                  onClick={() => setShowTestInput(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="w-4 h-4 mr-2" /> Send Test Email
                </Button>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSendTest}
                      disabled={sendTestMutation.isPending}
                      className="flex-1"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {sendTestMutation.isPending ? 'Sending...' : 'Send'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowTestInput(false);
                        setTestEmail('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? 'Saving...' : 'Save Email Builder'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function GmailCompatiblePreview({ branding, visibleFields }) {
  const getHeaderBackgroundStyle = () => {
    const backgroundType = branding?.email_header_background_type || 'solid';
    switch (backgroundType) {
      case 'image':
        return {
          backgroundImage: `url(${branding?.email_header_background_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        };
      case 'gradient':
        return { background: branding?.email_header_background_gradient };
      default:
        return { backgroundColor: branding?.email_header_background_color || '#2563eb' };
    }
  };

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      border: '1px solid #ddd',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        ...getHeaderBackgroundStyle(),
        padding: '30px',
        color: branding?.email_header_text_color || 'white',
        textAlign: 'center'
      }}>
        {branding?.email_header_show_logo !== false && branding?.email_header_logo_url && (
          <img src={branding.email_header_logo_url} alt="Logo" style={{ maxHeight: '50px', marginBottom: '15px' }} />
        )}
        <h1 style={{ margin: '0', fontSize: '24px' }}>Crew Assignment</h1>
      </div>

      {/* Body */}
      <div style={{ padding: '30px', backgroundColor: 'white' }}>
        <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#333' }}>
          You have been assigned to a project
        </h2>

        <div style={{
          margin: '20px 0',
          padding: '15px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          {visibleFields.includes('project_name') && (
            <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
              <strong>Project:</strong> Sample Project Name
            </p>
          )}
          {visibleFields.includes('crew_name') && (
            <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
              <strong>Crew Member:</strong> John Doe
            </p>
          )}
          {visibleFields.includes('role') && (
            <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
              <strong>Role:</strong> Audio Technician
            </p>
          )}
          {visibleFields.includes('date') && (
            <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
              <strong>Date:</strong> April 15, 2026
            </p>
          )}
          {visibleFields.includes('start_time') && (
            <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
              <strong>Start Time:</strong> 9:00 AM
            </p>
          )}
          {visibleFields.includes('end_time') && (
            <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
              <strong>End Time:</strong> 6:00 PM
            </p>
          )}
          {visibleFields.includes('location') && (
            <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
              <strong>Location:</strong> Convention Center
            </p>
          )}
          {visibleFields.includes('cost') && (
            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
              <strong>Pay:</strong> $1,200
            </p>
          )}
        </div>

        <div style={{ textAlign: 'center', margin: '30px 0' }}>
          <a href="#" style={{
            display: 'inline-block',
            padding: '12px 30px',
            backgroundColor: '#10b981',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            marginRight: '15px'
          }}>
            ✓ Confirm
          </a>
          <a href="#" style={{
            display: 'inline-block',
            padding: '12px 30px',
            backgroundColor: '#ef4444',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold'
          }}>
            ✗ Decline
          </a>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: branding?.email_footer_background_color || '#f9fafb',
        padding: '20px',
        borderTop: '1px solid #e5e7eb',
        fontSize: '12px',
        color: '#6b7280',
        textAlign: 'center'
      }}>
        {branding?.email_footer_show_company_name !== false && branding?.company_name && (
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>{branding.company_name}</strong>
          </p>
        )}
        <p style={{ margin: '0' }}>
          {branding?.email_footer_show_phone !== false && branding?.company_phone && (
            <span>{branding.company_phone}</span>
          )}
          {branding?.email_footer_show_phone !== false && branding?.company_phone && branding?.email_footer_show_email !== false && branding?.company_email && (
            <span> • </span>
          )}
          {branding?.email_footer_show_email !== false && branding?.company_email && (
            <span>{branding.company_email}</span>
          )}
        </p>
      </div>
    </div>
  );
}