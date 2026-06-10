import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Guard: only real assignees qualify for an email
function isRealAssignee(data) {
  const name = (data.crew_member_name || '').trim().toLowerCase();
  const email = (data.crew_member_email || '').trim();
  // Reject TBD, empty, or missing email
  if (!name || name === 'tbd' || !email) return false;
  return true;
}

function buildHtmlEmail(brand, data, confirmUrl, declineUrl) {
  const headerBg = brand?.email_header_background_color || '#2563eb';
  const headerText = brand?.email_header_text_color || '#ffffff';
  const footerBg = brand?.email_footer_background_color || '#f9fafb';
  const footerText = brand?.email_footer_text_color || '#6b7280';

  const rows = [
    { label: 'Project', value: data.show_name },
    { label: 'Role', value: data.role },
    { label: 'Date', value: data.assignment_date },
    { label: 'Start Time', value: data.start_time },
    { label: 'End Time', value: data.end_time },
    { label: 'Notes', value: data.notes },
  ].filter(r => r.value);

  const rowsHtml = rows.map(r => `
    <div style="margin: 8px 0; font-size: 14px; color: #333;">
      <strong>${r.label}:</strong> ${r.value}
    </div>
  `).join('');

  const logoHtml = brand?.email_header_show_logo !== false && brand?.email_header_logo_url
    ? `<img src="${brand.email_header_logo_url}" alt="Logo" style="max-height:60px; display:block; margin:0 auto 16px;" />`
    : '';

  const footerContactLines = [
    brand?.company_name ? `<p style="margin:0 0 4px; font-weight:bold;">${brand.company_name}</p>` : '',
    brand?.company_phone ? `<p style="margin:0 0 4px;">${brand.company_phone}</p>` : '',
    brand?.company_email ? `<p style="margin:0 0 4px;">${brand.company_email}</p>` : '',
  ].join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; background:#f5f5f5; color:#333; }
    .wrap { max-width:600px; margin:0 auto; background:white; box-shadow:0 1px 3px rgba(0,0,0,.1); }
    .hdr { background:${headerBg}; color:${headerText}; padding:40px 30px; text-align:center; }
    .hdr h1 { font-size:26px; font-weight:600; }
    .body { padding:40px 30px; }
    .intro { font-size:16px; color:#555; margin-bottom:28px; line-height:1.5; }
    .card { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:20px; margin-bottom:30px; }
    .actions { text-align:center; margin:32px 0; }
    .btn { display:inline-block; padding:14px 40px; font-size:15px; font-weight:600; text-decoration:none; border-radius:6px; margin:4px 8px; min-width:140px; }
    .btn-ok { background:#10b981; color:white; }
    .btn-no { background:#ef4444; color:white; }
    .ftr { background:${footerBg}; color:${footerText}; padding:28px 20px; text-align:center; font-size:12px; border-top:1px solid #e5e7eb; }
    @media(max-width:600px){
      .body,.hdr{padding:24px 16px;}
      .btn{padding:12px 24px;font-size:14px;display:block;margin:8px auto;max-width:200px;}
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      ${logoHtml}
      <h1>Crew Assignment</h1>
    </div>
    <div class="body">
      <div class="intro">You have been assigned to a project. Please confirm or decline your availability below.</div>
      <div class="card">${rowsHtml}</div>
      <div class="actions">
        <a href="${confirmUrl}" class="btn btn-ok">✓ Confirm</a>
        <a href="${declineUrl}" class="btn btn-no">✗ Decline</a>
      </div>
    </div>
    <div class="ftr">${footerContactLines}</div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // --- Guard: only send for real assigned crew members ---
    if (!isRealAssignee(data)) {
      return Response.json({ status: 'skipped', reason: 'No real assignee (TBD or missing email)' });
    }

    if (!data.send_notification) {
      return Response.json({ status: 'skipped', reason: 'Notification disabled' });
    }

    // Fetch show details
    const show = await base44.asServiceRole.entities.Show.get(data.show_id);
    if (!show) {
      return Response.json({ error: 'Show not found' }, { status: 404 });
    }

    // Fetch branding
    const brandList = await base44.asServiceRole.entities.BrandSettings.list();
    const brand = brandList?.[0] || {};

    // Generate secure confirm/decline tokens
    function generateToken() {
      return crypto.getRandomValues(new Uint8Array(32))
        .reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '');
    }

    const confirmToken = generateToken();
    const declineToken = generateToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await Promise.all([
      base44.asServiceRole.entities.CrewAssignmentToken.create({
        crew_assignment_id: data.id,
        crew_email: data.crew_member_email,
        token: confirmToken,
        action_type: 'confirm',
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      }),
      base44.asServiceRole.entities.CrewAssignmentToken.create({
        crew_assignment_id: data.id,
        crew_email: data.crew_member_email,
        token: declineToken,
        action_type: 'decline',
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      }),
    ]);

    const baseUrl = Deno.env.get('APP_URL') || 'https://your-app.com';
    const confirmUrl = `${baseUrl}/crew-confirmation?token=${confirmToken}&action=confirm`;
    const declineUrl = `${baseUrl}/crew-confirmation?token=${declineToken}&action=decline`;

    const html = buildHtmlEmail(brand, data, confirmUrl, declineUrl);

    await base44.integrations.Core.SendEmail({
      to: data.crew_member_email,
      subject: `Crew Assignment – ${data.show_name}`,
      body: html,
    });

    return Response.json({
      status: 'success',
      sent_to: data.crew_member_email,
    });
  } catch (error) {
    console.error('notifyCrewAssignment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});