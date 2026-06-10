import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import EmailBrandPreview from '@/components/email/EmailBrandPreview';
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

export default function EmailBrandingSettings() {
  const [formData, setFormData] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const queryClient = useQueryClient();

  // Fetch brand settings
  const { data: brandSettings = [] } = useQuery({
    queryKey: ['brandSettings'],
    queryFn: () => base44.entities.BrandSettings.list()
  });

  // Fetch field controls
  const { data: fieldControls = [] } = useQuery({
    queryKey: ['emailFieldControls'],
    queryFn: () => base44.entities.EmailFieldControl.list()
  });

  const brand = brandSettings[0] || {};

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const result = brand.id ? 
        await base44.entities.BrandSettings.update(brand.id, data) :
        await base44.entities.BrandSettings.create(data);
      
      // Auto-create email template
      const templates = await base44.entities.EmailTemplate.filter({ template_type: 'crew_assignment' });
      if (templates.length === 0) {
        await base44.entities.EmailTemplate.create({
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
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      alert('Email branding saved successfully!');
    }
  });

  const fieldUpdateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmailFieldControl.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emailFieldControls'] })
  });

  // Initialize form data and missing fields
  useEffect(() => {
    if (brand) {
      setFormData(brand);
    }

    const existingFields = fieldControls.map(f => f.field_name);
    const missingFields = DEFAULT_FIELDS.filter(f => !existingFields.includes(f.field_name));

    if (missingFields.length > 0) {
      base44.entities.EmailFieldControl.bulkCreate(
        missingFields.map(field => ({
          field_name: field.field_name,
          display_label: field.display_label,
          is_visible: true
        }))
      ).then(() => queryClient.invalidateQueries({ queryKey: ['emailFieldControls'] }));
    }
  }, [brand]);

  const handleFileUpload = async (file, fieldName) => {
    try {
      setUploadProgress(50);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadProgress(100);
      setFormData({ ...formData, [fieldName]: file_url });
      setTimeout(() => setUploadProgress(0), 1000);
    } catch (error) {
      alert('Upload failed: ' + error.message);
    }
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const toggleField = (field) => {
    if (!field.id) {
      base44.entities.EmailFieldControl.create({
        field_name: field.field_name,
        display_label: field.display_label,
        is_visible: !field.is_visible
      }).then(() => queryClient.invalidateQueries({ queryKey: ['emailFieldControls'] }));
    } else {
      fieldUpdateMutation.mutate({ id: field.id, data: { is_visible: !field.is_visible } });
    }
  };

  const displayFields = (fieldControls.length > 0 ? fieldControls : DEFAULT_FIELDS.map(f => ({ ...f, is_visible: true })))
    .filter(f => DEFAULT_FIELDS.some(df => df.field_name === f.field_name));

  if (!formData) {
    return <div className="flex items-center justify-center p-8"><p>Loading...</p></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Email Branding" description="Customize header, footer, fields, and preview crew assignment emails" />

      {/* HEADER SETTINGS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Header Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
              <Label>Header Background Type</Label>
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
          </div>

          {formData.email_header_background_type === 'solid' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.email_header_background_color || '#2563eb'}
                    onChange={(e) => setFormData({ ...formData, email_header_background_color: e.target.value })}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={formData.email_header_background_color || '#2563eb'}
                    onChange={(e) => setFormData({ ...formData, email_header_background_color: e.target.value })}
                    placeholder="#2563eb"
                  />
                </div>
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
              <Label>Gradient CSS</Label>
              <Input
                placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                value={formData.email_header_background_gradient || ''}
                onChange={(e) => setFormData({ ...formData, email_header_background_gradient: e.target.value })}
              />
            </div>
          )}

          <div>
            <Label>Header Text Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={formData.email_header_text_color || '#ffffff'}
                onChange={(e) => setFormData({ ...formData, email_header_text_color: e.target.value })}
                className="h-10 w-20"
              />
              <Input
                type="text"
                value={formData.email_header_text_color || '#ffffff'}
                onChange={(e) => setFormData({ ...formData, email_header_text_color: e.target.value })}
                placeholder="#ffffff"
              />
            </div>
          </div>

          <div>
            <Label>Show Logo</Label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.email_header_show_logo !== false}
                onChange={(e) => setFormData({ ...formData, email_header_show_logo: e.target.checked })}
              />
              <span className="text-sm">Display logo in header</span>
            </label>
          </div>

          <div>
            <Label>Show Social Links</Label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.email_header_show_social !== false}
                onChange={(e) => setFormData({ ...formData, email_header_show_social: e.target.checked })}
              />
              <span className="text-sm">Display social media links</span>
            </label>
          </div>

          {formData.email_header_show_social && (
            <div className="border-t pt-4 space-y-2">
              <Label className="text-sm font-semibold">Social Media Links</Label>
              <div>
                <Label className="text-xs">Instagram</Label>
                <Input
                  placeholder="https://instagram.com/yourpage"
                  value={formData.email_header_social_instagram || ''}
                  onChange={(e) => setFormData({ ...formData, email_header_social_instagram: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Facebook</Label>
                <Input
                  placeholder="https://facebook.com/yourpage"
                  value={formData.email_header_social_facebook || ''}
                  onChange={(e) => setFormData({ ...formData, email_header_social_facebook: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">LinkedIn</Label>
                <Input
                  placeholder="https://linkedin.com/company/yourcompany"
                  value={formData.email_header_social_linkedin || ''}
                  onChange={(e) => setFormData({ ...formData, email_header_social_linkedin: e.target.value })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FOOTER SETTINGS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Footer Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Footer Logo (optional)</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'email_footer_logo_url')}
                />
              </div>
              {formData.email_footer_logo_url && (
                <img src={formData.email_footer_logo_url} alt="Footer Logo" className="h-8 mt-2" />
              )}
            </div>

            <div>
              <Label>Footer Background Type</Label>
              <Select
                value={formData.email_footer_background_type || 'solid'}
                onValueChange={(v) => setFormData({ ...formData, email_footer_background_type: v })}
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
          </div>

          {formData.email_footer_background_type === 'solid' && (
            <div>
              <Label>Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.email_footer_background_color || '#f9fafb'}
                  onChange={(e) => setFormData({ ...formData, email_footer_background_color: e.target.value })}
                  className="h-10 w-20"
                />
                <Input
                  type="text"
                  value={formData.email_footer_background_color || '#f9fafb'}
                  onChange={(e) => setFormData({ ...formData, email_footer_background_color: e.target.value })}
                  placeholder="#f9fafb"
                />
              </div>
            </div>
          )}

          {formData.email_footer_background_type === 'image' && (
            <div>
              <Label>Background Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'email_footer_background_url')}
              />
            </div>
          )}

          {formData.email_footer_background_type === 'gradient' && (
            <div>
              <Label>Gradient CSS</Label>
              <Input
                placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                value={formData.email_footer_background_gradient || ''}
                onChange={(e) => setFormData({ ...formData, email_footer_background_gradient: e.target.value })}
              />
            </div>
          )}

          <div>
            <Label>Footer Text Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={formData.email_footer_text_color || '#6b7280'}
                onChange={(e) => setFormData({ ...formData, email_footer_text_color: e.target.value })}
                className="h-10 w-20"
              />
              <Input
                type="text"
                value={formData.email_footer_text_color || '#6b7280'}
                onChange={(e) => setFormData({ ...formData, email_footer_text_color: e.target.value })}
                placeholder="#6b7280"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
          </div>

          <div>
            <Label>Company Address</Label>
            <Textarea
              value={formData.company_address || ''}
              onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
              placeholder="Street, City, State ZIP"
              rows={2}
            />
          </div>

          <div>
            <Label>Custom Footer Message</Label>
            <Textarea
              value={formData.email_footer_custom_text || ''}
              onChange={(e) => setFormData({ ...formData, email_footer_custom_text: e.target.value })}
              placeholder="e.g., Thank you for working with us"
              rows={2}
            />
          </div>

          <div>
            <Label>Disclaimer / Legal Text</Label>
            <Textarea
              value={formData.email_footer_disclaimer || ''}
              onChange={(e) => setFormData({ ...formData, email_footer_disclaimer: e.target.value })}
              placeholder="Optional legal disclaimer"
              rows={2}
            />
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm font-semibold mb-3 block">Footer Display Options</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.email_footer_show_logo !== false}
                  onChange={(e) => setFormData({ ...formData, email_footer_show_logo: e.target.checked })}
                />
                <span className="text-sm">Show Logo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.email_footer_show_company_name !== false}
                  onChange={(e) => setFormData({ ...formData, email_footer_show_company_name: e.target.checked })}
                />
                <span className="text-sm">Show Company Name</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.email_footer_show_phone !== false}
                  onChange={(e) => setFormData({ ...formData, email_footer_show_phone: e.target.checked })}
                />
                <span className="text-sm">Show Phone</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.email_footer_show_email !== false}
                  onChange={(e) => setFormData({ ...formData, email_footer_show_email: e.target.checked })}
                />
                <span className="text-sm">Show Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.email_footer_show_website !== false}
                  onChange={(e) => setFormData({ ...formData, email_footer_show_website: e.target.checked })}
                />
                <span className="text-sm">Show Website</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.email_footer_show_address !== false}
                  onChange={(e) => setFormData({ ...formData, email_footer_show_address: e.target.checked })}
                />
                <span className="text-sm">Show Address</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.email_footer_show_social !== false}
                  onChange={(e) => setFormData({ ...formData, email_footer_show_social: e.target.checked })}
                />
                <span className="text-sm">Show Social Links</span>
              </label>
            </div>
          </div>

          {formData.email_footer_show_social && (
            <div className="border-t pt-4 space-y-2">
              <Label className="text-sm font-semibold">Social Media Links</Label>
              <div>
                <Label className="text-xs">Instagram</Label>
                <Input
                  placeholder="https://instagram.com/yourpage"
                  value={formData.email_footer_social_instagram || ''}
                  onChange={(e) => setFormData({ ...formData, email_footer_social_instagram: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Facebook</Label>
                <Input
                  placeholder="https://facebook.com/yourpage"
                  value={formData.email_footer_social_facebook || ''}
                  onChange={(e) => setFormData({ ...formData, email_footer_social_facebook: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">LinkedIn</Label>
                <Input
                  placeholder="https://linkedin.com/company/yourcompany"
                  value={formData.email_footer_social_linkedin || ''}
                  onChange={(e) => setFormData({ ...formData, email_footer_social_linkedin: e.target.value })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FIELD SELECTION */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email Body Fields</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Select which fields to display in crew assignment emails.</p>
          <div className="space-y-2">
            {displayFields.map((field) => (
              <label key={field.field_name} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
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

      {/* LIVE PREVIEW */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Live Email Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailBrandPreview 
            type="full" 
            branding={formData}
            visibleFields={displayFields.filter(f => f.is_visible !== false).map(f => f.field_name)}
          />
        </CardContent>
      </Card>

      {/* SAVE BUTTON */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setFormData(brand)}>Reset</Button>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}