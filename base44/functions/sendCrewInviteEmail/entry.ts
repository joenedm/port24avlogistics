import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function generateToken() {
  return crypto.getRandomValues(new Uint8Array(32)).reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
}

function generateCrewInviteEmail(template, branding, emailData, confirmUrl, declineUrl) {
  if (!template) {
    throw new Error('Email template is required');
  }

  const headerBgColor = branding?.email_header_background_color || '#2563eb';
  const headerTextColor = branding?.email_header_text_color || '#ffffff';
  const footerBgColor = branding?.email_footer_background_color || '#f9fafb';
  const footerTextColor = branding?.email_footer_text_color || '#6b7280';

  // Build info card rows, only showing fields with values
  const infoRows = [
    { label: 'Project', value: emailData.project_name },
    { label: 'Crew Member', value: emailData.crew_name },
    { label: 'Role', value: emailData.role },
    { label: 'Dates', value: emailData.date },
    { label: 'Start Time', value: emailData.start_time },
    { label: 'End Time', value: emailData.end_time },
    { label: 'Location', value: emailData.location },
    { label: 'Pay', value: emailData.cost },
  ].filter(row => row.value);

  const infoRowsHtml = infoRows
    .map(row => `
      <div style="margin: 8px 0; font-size: 14px; color: #333;">
        <strong>${row.label}:</strong> ${row.value}
      </div>
    `)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    .email-container { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      background-color: ${headerBgColor};
      color: ${headerTextColor};
      padding: 40px 30px;
      text-align: center;
    }
    .header img { 
      max-height: 60px; 
      margin-bottom: 20px;
      display: block;
    }
    .header h1 { 
      font-size: 28px;
      font-weight: 600;
      margin: 0;
    }
    .content { 
      padding: 40px 30px;
    }
    .intro {
      font-size: 16px;
      color: #555;
      margin-bottom: 30px;
      line-height: 1.5;
    }
    .info-card {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .actions {
      text-align: center;
      margin: 40px 0;
      display: flex;
      gap: 15px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-block;
      padding: 14px 40px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 6px;
      text-align: center;
      transition: background-color 0.2s;
      border: none;
      cursor: pointer;
      min-width: 160px;
    }
    .btn-confirm { 
      background-color: #10b981;
      color: white;
    }
    .btn-confirm:hover { 
      background-color: #059669;
    }
    .btn-decline { 
      background-color: #ef4444;
      color: white;
    }
    .btn-decline:hover { 
      background-color: #dc2626;
    }
    .footer {
      background-color: ${headerBgColor};
      color: ${headerTextColor};
      padding: 30px;
      text-align: center;
      font-size: 12px;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 4px 0;
    }
    .footer-divider {
      margin: 0 8px;
      display: inline;
    }
    @media (max-width: 600px) {
      .content { padding: 20px 15px; }
      .header { padding: 30px 15px; }
      .btn { 
        padding: 12px 30px;
        font-size: 14px;
        min-width: 120px;
      }
      .actions {
        flex-direction: column;
        gap: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- HEADER -->
    <div class="header">
      ${branding?.email_header_show_logo !== false && branding?.email_header_logo_url
        ? `<img src="${branding.email_header_logo_url}" alt="Company Logo" />`
        : ''
      }
      <h1>Crew Assignment</h1>
    </div>

    <!-- CONTENT -->
    <div class="content">
      <div class="intro">
        You have been assigned to a project. Please confirm or decline below.
      </div>

      <div class="info-card">
        ${infoRowsHtml}
      </div>

      <div class="actions">
        <a href="${confirmUrl}" class="btn btn-confirm">✓ Confirm</a>
        <a href="${declineUrl}" class="btn btn-decline">✗ Decline</a>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      ${branding?.company_name ? `<p><strong>${branding.company_name}</strong></p>` : ''}
      ${branding?.company_email || branding?.company_phone
        ? `<p>
            ${branding?.company_phone ? branding.company_phone : ''}
            ${branding?.company_phone && branding?.company_email ? '<span class="footer-divider">•</span>' : ''}
            ${branding?.company_email ? branding.company_email : ''}
          </p>`
        : ''
      }
    </div>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { templateId, crewBookingId, recipientEmail, showId } = await req.json();

    if (!templateId || !recipientEmail || !crewBookingId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch template
    let template;
    try {
      template = await base44.entities.EmailTemplate.get(templateId);
    } catch {
      return Response.json({ error: 'Email template not found. It may have been deleted.' }, { status: 404 });
    }

    // Fetch crew booking
    let booking;
    try {
      booking = await base44.entities.CrewBooking.get(crewBookingId);
    } catch {
      return Response.json({ error: 'Crew booking not found. It may have been deleted.' }, { status: 404 });
    }

    // Fetch show if provided
    let show = null;
    if (showId) {
      try {
        show = await base44.entities.Show.get(showId);
      } catch {
        // Non-blocking — fall back to booking's show data
        console.warn('Show not found by ID, using booking show data');
      }
    }

    // Fetch branding
    const brands = await base44.entities.BrandSettings.list();
    const branding = brands[0] || {};

    // Generate tokens for confirm/decline
    const confirmToken = generateToken();
    const declineToken = generateToken();

    // Create tokens in database
    await base44.entities.BookingConfirmationToken.bulkCreate([
      {
        crew_booking_id: crewBookingId,
        crew_email: recipientEmail,
        token: confirmToken,
        action_type: 'confirm',
        created_at: new Date().toISOString()
      },
      {
        crew_booking_id: crewBookingId,
        crew_email: recipientEmail,
        token: declineToken,
        action_type: 'decline',
        created_at: new Date().toISOString()
      }
    ]);

    // Build email data
    const rawBaseUrl = Deno.env.get('APP_URL') || '';
    // Strip any trailing slash and any path after the origin (e.g. /apps/xxx editor paths)
    let baseUrl = rawBaseUrl;
    try {
      const u = new URL(rawBaseUrl);
      baseUrl = u.origin; // e.g. https://myapp.base44.app
    } catch {
      baseUrl = rawBaseUrl.replace(/\/$/, '');
    }

    const projectName = show?.name || booking.show_name || '';
    const crewName = booking.crew_name || '';
    const role = booking.role || '';
    const startDate = booking.start_date || show?.start_date || '';
    const endDate = booking.end_date || show?.end_date || '';

    // Format dates as "Apr 20, 2026"
    function fmtDate(str) {
      if (!str) return '';
      const d = new Date(str + (str.length === 10 ? 'T00:00:00' : ''));
      if (isNaN(d)) return str;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    const fmtStart = fmtDate(startDate);
    const fmtEnd = fmtDate(endDate);
    const dateRange = fmtStart && fmtEnd && fmtStart !== fmtEnd
      ? `${fmtStart} – ${fmtEnd}`
      : (fmtStart || fmtEnd || '');

    // ── Pre-send validation ──────────────────────────────────────────────────
    const validationErrors = [];
    if (!projectName) validationErrors.push('Project / show name is missing from the booking.');
    if (!crewName) validationErrors.push('Crew member name is missing from the booking.');
    if (!role) validationErrors.push('Role is missing from the booking.');
    if (!startDate) validationErrors.push('Start date is missing from the booking.');
    if (!baseUrl || baseUrl.includes('localhost') || !baseUrl.startsWith('http')) {
      validationErrors.push('APP_URL secret is not configured correctly. Please set it in Settings → Secrets to your live app URL (e.g. https://myapp.base44.app).');
    }

    if (validationErrors.length > 0) {
      return Response.json({
        error: 'Cannot send: required fields are missing.',
        validation_errors: validationErrors
      }, { status: 422 });
    }
    // ────────────────────────────────────────────────────────────────────────

    const emailData = {
      project_name: projectName,
      crew_name: crewName,
      role,
      date: dateRange,
      start_time: booking.start_time || '',
      end_time: booking.end_time || '',
      location: show?.venue || booking.location || '',
      cost: booking.rate ? `$${booking.rate}/${booking.rate_type || 'day'}` : '',
    };

    // Each token already encodes its action_type (confirm/decline) — no extra param needed
    const confirmUrl = `${baseUrl}/booking-confirmation?token=${confirmToken}`;
    const declineUrl = `${baseUrl}/booking-confirmation?token=${declineToken}`;
    console.log('📧 Confirm URL:', confirmUrl);
    console.log('📧 Decline URL:', declineUrl);

    // ── Merge {{variable}} placeholders in the subject line ──────────────────
    const mergeVars = {
      project_name: projectName,
      show_name: projectName,
      crew_name: crewName,
      role,
      date: dateRange,
      date_range: dateRange,
      start_date: fmtStart,
      end_date: fmtEnd,
    };
    let subject = template.subject_line || 'Crew Assignment';
    subject = subject.replace(/\{\{(\w+)\}\}/g, (_, key) => mergeVars[key] ?? '');
    // ────────────────────────────────────────────────────────────────────────

    // Generate email HTML
    const html = generateCrewInviteEmail(template, branding, emailData, confirmUrl, declineUrl);

    // Send email
    await base44.integrations.Core.SendEmail({
      to: recipientEmail,
      subject,
      body: html
    });

    return Response.json({
      success: true,
      message: 'Crew invitation email sent successfully',
      sentTo: recipientEmail
    });
  } catch (error) {
    console.error('Error sending crew invite email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});