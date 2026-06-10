import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { generateCrewInviteEmail } from '@/lib/emailRenderer';
import { formatDateRange } from '@/lib/dateRange';

export default function CrewInviteWorkflow({
  open,
  onOpenChange,
  crewBookingData = null,
  recipientEmail = null,
  showData = null,
  crewBookingId = null,
}) {
  const [step, setStep] = useState('template-select');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [sendStatus, setSendStatus] = useState(null);
  const [error, setError] = useState('');
  const [renderedEmail, setRenderedEmail] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [savedCrewBookingId, setSavedCrewBookingId] = useState(crewBookingId);

  const { data: templates = [] } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => db.entities.EmailTemplate.list(),
  });

  const { data: brandSettings = [] } = useQuery({
    queryKey: ['brandSettings'],
    queryFn: () => db.entities.BrandSettings.list(),
  });

  // Fetch CrewBooking data if ID is provided
  const { data: savedBookingData = null, isLoading: isLoadingBooking } = useQuery({
    queryKey: ['crewBooking', crewBookingId],
    queryFn: async () => {
      if (!crewBookingId) return null;
      try {
        const booking = await db.entities.CrewBooking.get(crewBookingId);
        console.log('✅ CrewBooking loaded from database:', booking.id);
        return booking;
      } catch (err) {
        console.error('❌ Failed to load CrewBooking:', err);
        throw new Error(`Crew booking could not be loaded: ${err.message}`);
      }
    },
    enabled: !!crewBookingId,
  });

  // Use the crewBookingId passed directly (already saved in ProjectCrewPanel)
  useEffect(() => {
    if (open && crewBookingId) {
      setSavedCrewBookingId(crewBookingId);
      console.log('📌 Using CrewBooking ID in workflow:', crewBookingId);
    }
  }, [open, crewBookingId]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!recipientEmail) throw new Error('No recipient email address found');
      if (!selectedTemplate) throw new Error('No template selected');
      if (!savedCrewBookingId) throw new Error('No valid crew booking ID found');

      setSendStatus('sending');

      // Get current user for audit trail
      let currentUserEmail = '';
      try {
        const me = await db.auth.me();
        currentUserEmail = me?.email || '';
      } catch {}

      // Re-fetch the latest booking record (never rely on stale cache)
      let latestBooking;
      try {
        latestBooking = await db.entities.CrewBooking.get(savedCrewBookingId);
        console.log('📋 Booking re-fetched:', latestBooking.id, '| project_crew_id:', latestBooking.project_crew_id || '(none)');
      } catch (err) {
        throw new Error('Could not load the crew booking record. It may have been deleted.');
      }

      // Validate required fields
      if (!latestBooking.show_id) throw new Error('Crew booking is not linked to a project.');
      if (!latestBooking.crew_id && !latestBooking.crew_name) throw new Error('Crew booking has no crew member.');

      // Validate or auto-repair the ProjectCrew link
      let projectCrewId = latestBooking.project_crew_id;
      let projectCrewVerified = false;

      if (projectCrewId) {
        try {
          await db.entities.ProjectCrew.get(projectCrewId);
          projectCrewVerified = true;
          console.log('✅ ProjectCrew record verified:', projectCrewId);
        } catch {
          console.warn('⚠️ ProjectCrew ID is stale/missing — will attempt auto-repair:', projectCrewId);
          projectCrewId = null;
        }
      }

      // Auto-repair: search for an existing ProjectCrew that matches this booking
      if (!projectCrewVerified) {
        try {
          const existingCrew = await db.entities.ProjectCrew.filter({
            show_id: latestBooking.show_id,
            crew_member_email: latestBooking.crew_email,
          });
          const match = existingCrew.find(
            pc => pc.role === latestBooking.role || pc.crew_member_email === latestBooking.crew_email
          );
          if (match) {
            projectCrewId = match.id;
            projectCrewVerified = true;
            console.log('🔧 Auto-repair: found existing ProjectCrew by email match:', projectCrewId);
          }
        } catch {}
      }

      // Auto-repair: create a new ProjectCrew if still not found
      if (!projectCrewVerified) {
        try {
          const show = showData || { id: latestBooking.show_id, name: latestBooking.show_name };
          const newPC = await db.entities.ProjectCrew.create({
            show_id: latestBooking.show_id,
            show_name: latestBooking.show_name || show.name || '',
            crew_member_name: latestBooking.crew_id || '',
            crew_member_email: latestBooking.crew_email || '',
            role: latestBooking.role || 'Crew Member',
            assignment_date: latestBooking.start_date || '',
            start_time: latestBooking.start_time || '',
            end_time: latestBooking.end_time || '',
            location: latestBooking.location || '',
            quantity: 1,
            rate_type: latestBooking.rate_type || 'daily',
            internal_cost: latestBooking.rate || 0,
            billable_cost: latestBooking.rate || 0,
            internal_rate: latestBooking.rate || 0,
            billable_rate: latestBooking.rate || 0,
            assignment_status: 'not_sent',
          });
          projectCrewId = newPC.id;
          projectCrewVerified = true;
          console.log('🔧 Auto-repair: created new ProjectCrew:', projectCrewId);
        } catch (err) {
          // Non-blocking — log but continue; ProjectCrew sync is best-effort
          console.error('⚠️ Could not auto-create ProjectCrew (non-blocking):', err.message);
        }
      }

      // Update the booking's project_crew_id if we repaired it
      if (projectCrewId && projectCrewId !== latestBooking.project_crew_id) {
        await db.entities.CrewBooking.update(savedCrewBookingId, { project_crew_id: projectCrewId });
        console.log('🔗 Booking re-linked to ProjectCrew:', projectCrewId);
      }

      // Stamp booking as pending + audit fields
      await db.entities.CrewBooking.update(savedCrewBookingId, {
        status: 'pending',
        email_sent_at: new Date().toISOString(),
        sent_by: currentUserEmail,
      });

      // Sync status to ProjectCrew (best-effort — never block send on this)
      if (projectCrewId && projectCrewVerified) {
        try {
          await db.entities.ProjectCrew.update(projectCrewId, {
            assignment_status: 'pending',
            status_updated_at: new Date().toISOString(),
          });
          console.log('✅ ProjectCrew status synced to pending');
        } catch (err) {
          console.warn('⚠️ Could not sync ProjectCrew status (non-blocking):', err.message);
        }
      }

      const response = await db.functions.invoke('sendCrewInviteEmail', {
        templateId: selectedTemplate,
        crewBookingId: savedCrewBookingId,
        recipientEmail,
        showId: latestBooking.show_id || showData?.id,
      });

      console.log('✅ Email sent successfully');
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
      const responseData = err.response?.data;
      const rawMsg = responseData?.error || err.message || 'Failed to send email';
      console.error('Send error:', rawMsg, responseData);

      // If server returned a validation_errors list, format them nicely
      if (responseData?.validation_errors?.length) {
        setError(`Cannot send — required fields are missing:\n• ${responseData.validation_errors.join('\n• ')}`);
        return;
      }

      // Map raw entity errors to clean user-friendly messages
      let friendlyMsg = rawMsg;
      if (rawMsg.includes('ProjectCrew') && rawMsg.includes('not found')) {
        friendlyMsg = 'This crew assignment is missing its linked project record. Please remove and re-add the crew member to the show, then try again.';
      } else if (rawMsg.includes('CrewBooking') && rawMsg.includes('not found')) {
        friendlyMsg = 'The crew booking could not be found. It may have been deleted. Please close and try again.';
      } else if (rawMsg.includes('not linked to a project')) {
        friendlyMsg = 'Crew assignment link is missing. Please resave the crew assignment from the project page.';
      } else if (rawMsg.includes('APP_URL')) {
        friendlyMsg = 'APP_URL is not configured. Go to Settings → Secrets and set APP_URL to your live app URL (e.g. https://myapp.base44.app).';
      }
      setError(friendlyMsg);
    }
  });

  const handleTemplateSelect = () => {
    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }
    if (!recipientEmail) {
      setError('No recipient email found');
      return;
    }

    // Pre-flight validation — catch missing fields before sending
    const projectName = showData?.name || crewBookingData?.show_name || savedBookingData?.show_name || '';
    const crewName = crewBookingData?.crew_name || savedBookingData?.crew_name || '';
    const role = crewBookingData?.role || savedBookingData?.role || '';
    const startDate = crewBookingData?.start_date || savedBookingData?.start_date || showData?.start_date || '';

    const missing = [];
    if (!projectName) missing.push('Project / show name');
    if (!crewName) missing.push('Crew member name');
    if (!role) missing.push('Role');
    if (!startDate) missing.push('Start date');

    if (missing.length > 0) {
      setError(`Cannot send — the following required fields are missing from the booking:\n• ${missing.join('\n• ')}\n\nPlease update the booking record before sending.`);
      return;
    }

    try {
      renderEmailPreview();
      setError('');
      setStep('review');
    } catch (err) {
      setError('Failed to render email preview: ' + err.message);
      console.error('Render error:', err);
    }
  };

  const renderEmailPreview = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) throw new Error('Template not found');

    const branding = brandSettings[0] || {};
    const booking = crewBookingData || savedBookingData || {};

    const projectName = showData?.name || booking.show_name || '';
    const startDate = booking.start_date || showData?.start_date || '';
    const endDate = booking.end_date || showData?.end_date || '';
    const dateRange = formatDateRange(startDate, endDate);

    const emailData = {
      project_name: projectName,
      crew_name: booking.crew_name || '',
      role: booking.role || '',
      date: dateRange,
      start_time: booking.start_time || '',
      end_time: booking.end_time || '',
      location: showData?.venue || booking.location || '',
      cost: booking.rate ? `$${booking.rate}/${booking.rate_type || 'day'}` : '',
    };

    // Merge {{variable}} in subject for preview display
    const mergeVars = {
      project_name: projectName,
      show_name: projectName,
      crew_name: emailData.crew_name,
      role: emailData.role,
      date: dateRange,
      date_range: dateRange,
      start_date: formatDateRange(startDate, ''),
      end_date: formatDateRange(endDate, ''),
    };
    const resolvedSubject = (template.subject_line || 'Crew Assignment').replace(
      /\{\{(\w+)\}\}/g, (_, key) => mergeVars[key] ?? ''
    );
    setPreviewSubject(resolvedSubject);

    // Use placeholder URLs in preview (real tokens are generated server-side on actual send)
    const dummyBase = window.location.origin;
    const html = generateCrewInviteEmail(
      template, branding, emailData,
      `${dummyBase}/booking-confirmation?token=PREVIEW_CONFIRM`,
      `${dummyBase}/booking-confirmation?token=PREVIEW_DECLINE`
    );
    setRenderedEmail(html);
  };

  const handleBack = () => {
    setStep('template-select');
    setSendStatus(null);
    setError('');
    setPreviewSubject('');
  };

  const handleSend = () => {
    sendMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'template-select' && 'Send Crew Invitation'}
            {step === 'review' && 'Review Crew Invitation Email'}
            {step === 'sending' && 'Sending Email'}
          </DialogTitle>
        </DialogHeader>

        {/* TEMPLATE SELECTION STEP */}
        {step === 'template-select' && (
          <div className="space-y-4">
            {isLoadingBooking && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Loading crew booking...</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {savedBookingData && !isLoadingBooking && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-green-700 bg-green-50">✅ Crew booking loaded and ready to send</AlertDescription>
              </Alert>
            )}

            <div>
              <Label>Project</Label>
              <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                {savedBookingData?.show_name || showData?.name || crewBookingData?.show_name || 'No project'}
              </div>
            </div>

            {/* Show date range */}
            {(() => {
              const booking = savedBookingData || crewBookingData || {};
              const startDate = booking.start_date || showData?.start_date || '';
              const endDate = booking.end_date || showData?.end_date || '';
              const range = formatDateRange(startDate, endDate);
              return range ? (
                <div>
                  <Label>Show Dates</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md text-sm">{range}</div>
                </div>
              ) : null;
            })()}

            <div>
              <Label>Crew Member</Label>
              <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                {savedBookingData?.crew_name || crewBookingData?.crew_name || 'No recipient'}
                {(savedBookingData?.role || crewBookingData?.role) && (
                  <div className="text-xs text-muted-foreground mt-1">{savedBookingData?.role || crewBookingData?.role}</div>
                )}
                {(recipientEmail || savedBookingData?.crew_email) && (
                  <div className="text-xs text-muted-foreground mt-0.5">{recipientEmail || savedBookingData?.crew_email}</div>
                )}
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
                      {t.template_name || 'Untitled Template'}
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
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoadingBooking}>
                Cancel
              </Button>
              <Button
                onClick={handleTemplateSelect}
                disabled={!selectedTemplate || !recipientEmail || isLoadingBooking || !savedCrewBookingId}
              >
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

            <div className="bg-muted p-3 rounded-md text-sm space-y-1">
              <div><span className="font-semibold">To:</span> {recipientEmail}</div>
              {previewSubject && (
                <div><span className="font-semibold">Subject:</span> {previewSubject}</div>
              )}
            </div>

            {renderedEmail && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-100 p-4">
                  <div className="text-xs text-muted-foreground mb-2">Email Preview:</div>
                  <iframe
                    srcDoc={renderedEmail}
                    className="w-full bg-white rounded"
                    style={{ height: '500px', border: '1px solid #e5e7eb' }}
                    title="Email Preview"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={handleBack} disabled={sendMutation.isPending}>
                Edit Template
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sendMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sendMutation.isPending || !renderedEmail}>
                {sendMutation.isPending ? 'Sending...' : 'Approve and Send'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* SUCCESS */}
        {sendStatus === 'success' && (
          <div className="space-y-4 py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Email Sent Successfully</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Crew invitation sent to {recipientEmail}
              </p>
            </div>
          </div>
        )}

        {/* ERROR */}
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