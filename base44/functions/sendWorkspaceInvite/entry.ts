import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sendEmailWithFallback(base44, { to, subject, html }) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  let smtpSettings = null;
  try {
    const allSettings = await base44.asServiceRole.entities.WorkspaceEmailSettings.list();
    smtpSettings = allSettings?.[0] || null;
  } catch (e) {
    console.warn('[sendWorkspaceInvite] Could not load WorkspaceEmailSettings:', e.message);
  }
  const displayName = smtpSettings?.from_name || 'Port 24';

  // 1. Resend with custom verified domain
  if (RESEND_API_KEY && smtpSettings?.from_email) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `${displayName} <${smtpSettings.from_email}>`, to: [to], subject, html }),
      });
      const data = await res.json();
      if (res.ok) { console.log(`[sendWorkspaceInvite] Sent via Resend (custom) to ${to}`); return { sent: true, method: 'resend_custom' }; }
      console.warn(`[sendWorkspaceInvite] Resend custom failed: ${data?.message}`);
    } catch (e) { console.warn('[sendWorkspaceInvite] Resend custom threw:', e.message); }
  }

  // 2. Resend with default onboarding sender (no domain needed)
  if (RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `${displayName} <onboarding@resend.dev>`, to: [to], subject, html }),
      });
      const data = await res.json();
      if (res.ok) { console.log(`[sendWorkspaceInvite] Sent via Resend (default) to ${to}`); return { sent: true, method: 'resend_default' }; }
      console.warn(`[sendWorkspaceInvite] Resend default failed: ${data?.message}`);
    } catch (e) { console.warn('[sendWorkspaceInvite] Resend default threw:', e.message); }
  }

  // 3. Core.SendEmail (platform — always available)
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body: html, from_name: displayName });
    console.log(`[sendWorkspaceInvite] Sent via Core to ${to}`);
    return { sent: true, method: 'core' };
  } catch (e) {
    console.error('[sendWorkspaceInvite] Core failed:', e.message);
    return { sent: false, error: e.message };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email, full_name, company, role } = await req.json();
    if (!email || !role) return Response.json({ error: 'email and role are required' }, { status: 400 });

    const ROLE_LABELS = { admin: 'Admin', director: 'Director', manager: 'Manager', coordinator: 'Coordinator', crew: 'Crew' };
    const roleLabel = ROLE_LABELS[role] || role;

    const inviteToken = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const allInvites = await base44.asServiceRole.entities.PendingInvite.list();
    const existing = allInvites.find(i => i.email?.toLowerCase() === email.toLowerCase());
    const invitePayload = {
      email, role,
      full_name: full_name || '',
      company: company || '',
      invited_by: user.email || '',
      invite_token: inviteToken,
      temp_password_used: false,
      must_reset_password: true,
      expires_at: expiresAt,
      status: 'pending',
      accepted_at: null,
    };
    if (existing) {
      await base44.asServiceRole.entities.PendingInvite.update(existing.id, invitePayload);
    } else {
      await base44.asServiceRole.entities.PendingInvite.create(invitePayload);
    }

    const appUrl = (Deno.env.get('APP_URL') || 'https://port24avlogistics.base44.app').replace(/\/+$/, '');
    const inviteUrl = `${appUrl}/accept-invite?token=${inviteToken}`;

    const emailHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;background:#f4f6f8;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1FB8A0,#3DC9C0);height:5px;border-radius:12px 12px 0 0;"></td></tr>
<tr><td style="padding:44px 48px 36px;">
<p style="margin:0 0 6px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#1FB8A0;">Workspace Invitation</p>
<h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#0E1117;">
${full_name ? `Hi ${full_name.split(' ')[0]}, you're invited!` : "You're invited to Port 24"}
</h1>
<p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#4B5563;">
You've been granted access to <strong>Port 24</strong> as a <strong>${roleLabel}</strong>. Click below to create your account.
</p>
<table cellpadding="0" cellspacing="0" style="margin:0 0 36px;">
<tr><td style="border-radius:8px;background:#1FB8A0;">
<a href="${inviteUrl}" style="display:inline-block;padding:15px 40px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;border-radius:8px;">Create Your Account →</a>
</td></tr>
</table>
<p style="font-size:13px;line-height:1.6;color:#9CA3AF;">
Or copy: <a href="${inviteUrl}" style="color:#1FB8A0;word-break:break-all;font-size:12px;">${inviteUrl}</a><br/>Link expires in 7 days.
</p>
</td></tr>
<tr><td style="padding:16px 48px;border-top:1px solid #f0f0f0;text-align:center;">
<p style="font-size:12px;color:#9CA3AF;margin:0;">Port 24 — Production Management Platform</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

    // Use user-scoped invoke (not service role) so sendSmtpEmail can authenticate
    let result = { sent: false, error: null, method: null };
    try {
      const smtpRes = await base44.functions.invoke('sendSmtpEmail', {
        to: email,
        subject: `You've been invited to Port 24 as ${roleLabel}`,
        body: emailHtml,
      });
      const resData = smtpRes?.data || smtpRes;
      if (resData?.success) {
        result = { sent: true, method: resData.method || 'email' };
      } else {
        result.error = resData?.error || 'Unknown error from sendSmtpEmail';
        console.warn('[sendWorkspaceInvite] sendSmtpEmail returned failure:', result.error);
      }
    } catch (emailErr) {
      console.warn('[sendWorkspaceInvite] sendSmtpEmail invoke failed, falling back inline:', emailErr.message);
      // Final inline fallback: call Resend directly
      result = await sendEmailWithFallback(base44, {
        to: email,
        subject: `You've been invited to Port 24 as ${roleLabel}`,
        html: emailHtml,
      });
    }

    return Response.json({
      success: true,
      email_sent: result.sent,
      email_error: result.error || null,
      email_method: result.method || null,
      invite_url: inviteUrl,
      message: result.sent
        ? `Invite email sent to ${email} (via ${result.method})`
        : `Invite created but email failed — share the link manually: ${inviteUrl}`,
    });

  } catch (error) {
    console.error('[sendWorkspaceInvite] Fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});