import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function EmailApprovalWorkflow({ 
  open, 
  onOpenChange, 
  selectedShow = null,
  selectedPerson = null,
  personEmail = null
}) {
  const [step, setStep] = useState('template-select'); // template-select, review, sending
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [sendStatus, setSendStatus] = useState(null);
  const [error, setError] = useState('');
  const [renderedEmail, setRenderedEmail] = useState('');

  const { data: templates = [] } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.list(),
  });

  const { data: brandSettings = [] } = useQuery({
    queryKey: ['brandSettings'],
    queryFn: () => base44.entities.BrandSettings.list(),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!personEmail) throw new Error('No recipient email address found');
      
      setSendStatus('sending');
      const response = await base44.functions.invoke('sendApprovedEmail', {
        templateId: selectedTemplate,
        showId: selectedShow?.id,
        personId: selectedPerson?.id,
        recipientEmail: personEmail
      });
      
      return response.data;
    },
    onSuccess: () => {
      setSendStatus('success');
      setTimeout(() => {
        onOpenChange(false);
        setStep('template-select');
        setSelectedTemplate('');
        setSendStatus(null);
        setError('');
      }, 2000);
    },
    onError: (err) => {
      setSendStatus('error');
      setError(err.response?.data?.error || err.message);
    }
  });

  useEffect(() => {
    if (selectedTemplate && step === 'review') {
      renderEmailPreview();
    }
  }, [selectedTemplate, step]);

  const renderEmailPreview = async () => {
    try {
      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) return;

      const branding = brandSettings[0] || {};
      const fieldControls = await base44.entities.EmailFieldControl.filter({ is_visible: true });

      // Build email data
      const emailData = buildEmailData(selectedShow, selectedPerson);

      // Use compiled preview_html from template, falling back to empty
      const html = template.preview_html || '';
      setRenderedEmail(html);
    } catch (err) {
      setError('Failed to render email preview: ' + err.message);
    }
  };

  const buildEmailData = (show, person) => {
    return {
      project_name: show?.name || '',
      crew_name: person?.crew_name || person?.full_name || '',
      role: person?.role || '',
      date: show?.start_date || '',
      start_time: person?.start_time || '',
      end_time: person?.end_time || '',
      location: show?.venue || person?.location || '',
      cost: person?.rate || show?.total_value || '',
    };
  };

  const handleTemplateSelect = () => {
    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }
    if (!personEmail) {
      setError('No recipient email found. Please select a valid person.');
      return;
    }
    setError('');
    setStep('review');
  };

  const handleBack = () => {
    setStep('template-select');
    setSendStatus(null);
  };

  const handleSend = () => {
    sendMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'template-select' && 'Send Email'}
            {step === 'review' && 'Review Email'}
            {step === 'sending' && 'Sending Email'}
          </DialogTitle>
        </DialogHeader>

        {/* TEMPLATE SELECTION STEP */}
        {step === 'template-select' && (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="show-display">Project</Label>
              <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                {selectedShow?.name || 'No project selected'}
              </div>
            </div>

            <div>
              <Label htmlFor="person-display">Recipient</Label>
              <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                {selectedPerson?.crew_name || selectedPerson?.full_name || 'No recipient selected'}
                {personEmail && <div className="text-xs text-muted-foreground mt-1">{personEmail}</div>}
              </div>
            </div>

            <div>
              <Label htmlFor="template">Email Format / Template *</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Select email template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.template_name || 'Untitled'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  No email templates available. Create one in Email Builder first.
                </p>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleTemplateSelect} disabled={!selectedTemplate || !personEmail}>
                Continue to Review
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* REVIEW STEP */}
        {step === 'review' && (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-muted p-3 rounded-md text-sm">
              <div className="font-semibold mb-1">Sending to:</div>
              <div>{personEmail}</div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-slate-100 p-4">
                <div className="text-xs text-muted-foreground mb-2">Email Preview:</div>
                <iframe
                  srcDoc={renderedEmail}
                  className="w-full bg-white rounded"
                  style={{ height: '400px', border: '1px solid #e5e7eb' }}
                  title="Email Preview"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={handleBack} disabled={sendMutation.isPending}>
                Edit Template
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sendMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sendMutation.isPending}>
                {sendMutation.isPending ? 'Sending...' : 'Approve and Send'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* SENDING/SUCCESS STEP */}
        {sendStatus === 'success' && (
          <div className="space-y-4 py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Email Sent Successfully</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Email sent to {personEmail}
              </p>
            </div>
          </div>
        )}

        {sendStatus === 'error' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || 'Failed to send email'}</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button onClick={handleBack}>Back to Review</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}