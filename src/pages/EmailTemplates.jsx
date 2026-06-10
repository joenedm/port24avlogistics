import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Mail, Eye } from 'lucide-react';
import EmailBlockEditor from '@/components/email/EmailBlockEditor';
import EmailPreview from '@/components/email/EmailPreview';
import { nanoid } from '@/lib/nanoid';

export default function EmailTemplates() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [formData, setFormData] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.list()
  });

  const { data: brandSettings = [] } = useQuery({
    queryKey: ['brandSettings'],
    queryFn: () => base44.entities.BrandSettings.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      setShowNewDialog(false);
      setFormData(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmailTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      setEditingId(null);
      setFormData(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      setDeleteId(null);
    }
  });

  const sendTestMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('sendTestEmail', data),
    onSuccess: () => {
      setShowTestDialog(false);
      setTestEmail('');
    }
  });

  const openNew = () => {
    setFormData({
      template_name: '',
      subject_line: '',
      template_type: 'custom',
      header_enabled: true,
      footer_enabled: true,
      sections: []
    });
    setEditingId(null);
    setShowNewDialog(true);
  };

  const openEdit = (template) => {
    setFormData(template);
    setEditingId(template.id);
    setShowNewDialog(true);
  };

  const saveTemplate = () => {
    if (!formData?.template_name || !formData?.subject_line) {
      alert('Please fill in template name and subject line');
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSendTest = () => {
    if (!testEmail) {
      alert('Please enter an email address');
      return;
    }
    sendTestMutation.mutate({
      templateId: editingId,
      testEmail,
      templateData: { /* sample data */ }
    });
  };

  const currentTemplate = editingId && templates.find(t => t.id === editingId);
  const branding = brandSettings[0] || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground mt-1">Create and manage branded email templates</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> New Template
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.template_name}</CardTitle>
                  <CardDescription className="text-xs mt-1">{template.subject_line}</CardDescription>
                </div>
                {!template.is_active && <Badge variant="secondary">Inactive</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(template)}>
                  <Edit2 className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowTestDialog(true)}>
                  <Mail className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setDeleteId(template.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* New/Edit Template Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Template' : 'New Email Template'}</DialogTitle>
          </DialogHeader>

          {formData && (
            <Tabs defaultValue="editor" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Template Name</label>
                  <Input
                    value={formData.template_name}
                    onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                    placeholder="e.g., Crew Assignment Notification"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Subject Line</label>
                  <Input
                    value={formData.subject_line}
                    onChange={(e) => setFormData({ ...formData, subject_line: e.target.value })}
                    placeholder="e.g., Crew Assignment – {{Project Name}}"
                  />
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.header_enabled}
                      onChange={(e) => setFormData({ ...formData, header_enabled: e.target.checked })}
                    />
                    <span>Include Header</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.footer_enabled}
                      onChange={(e) => setFormData({ ...formData, footer_enabled: e.target.checked })}
                    />
                    <span>Include Footer</span>
                  </label>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Email Body</h3>
                  <EmailBlockEditor
                    sections={formData.sections || []}
                    onUpdateSections={(sections) => setFormData({ ...formData, sections })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="preview">
                <EmailPreview
                  sections={formData.sections || []}
                  headerEnabled={formData.header_enabled}
                  footerEnabled={formData.footer_enabled}
                  branding={branding}
                  subjectLine={formData.subject_line}
                />
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={saveTemplate} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      {editingId && (
        <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Send Test Email</DialogTitle>
              <DialogDescription>Send a preview to your email address</DialogDescription>
            </DialogHeader>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your@email.com"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTestDialog(false)}>Cancel</Button>
              <Button onClick={handleSendTest} disabled={sendTestMutation.isPending}>Send Test</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Template</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive">
            Delete
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}