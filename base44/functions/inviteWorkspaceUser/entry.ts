import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, full_name, company, role } = await req.json();
    if (!email || !role) return Response.json({ error: 'email and role required' }, { status: 400 });

    const ROLE_LABELS = { admin: 'Admin', director: 'Director', manager: 'Manager', coordinator: 'Coordinator', crew: 'Crew' };
    const roleLabel = ROLE_LABELS[role] || role;
    const inviteToken = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Upsert PendingInvite
    const allInvites = await base44.asServiceRole.entities.PendingInvite.list();
    const existing = allInvites.find(i => i.email?.toLowerCase() === email.toLowerCase());
    const invitePayload = { email, role, full_name: full_name || '', company: company || '', invited_by: user.email || '', invite_token: inviteToken, temp_password_used: false, must_reset_password: true, expires_at: expiresAt, status: 'pending', accepted_at: null };
    if (existing) { await base44.asServiceRole.entities.PendingInvite.update(existing.id, invitePayload); }
    else { await base44.asServiceRole.entities.PendingInvite.create(invitePayload); }

    const appUrl = (Deno.env.get('APP_URL') || 'https://port24avlogistics.base44.app').replace(/\/+$/, '');
    const inviteUrl = `${appUrl}/accept-invite?token=${inviteToken}`;
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY');

    let emailSent = false, emailError = null, emailMethod = null;

    if (RESEND_KEY) {
      const emailHtml = `<html><body style="font-family:Arial;background:#f4f6f8;padding:40px 16px;"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:44px 48px;"><div style="height:5px;background:linear-gradient(135deg,#1FB8A0,#3DC9C0);margin:-44px -48px 36px;border-radius:12px 12px 0 0;"></div><p style="color:#1FB8A0;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;">Workspace Invitation</p><h1 style="color:#0E1117;font-size:26px;">${full_name ? `Hi ${full_name.split(' ')[0]}, you're invited!` : "You're invited to Port 24"}</h1><p style="color:#4B5563;font-size:15px;line-height:1.7;">You've been granted access to <strong>Port 24</strong> as a <strong>${roleLabel}</strong>.</p><a href="${inviteUrl}" style="display:inline-block;margin:24px 0;padding:15px 40px;background:#1FB8A0;color:#fff;font-weight:700;font-size:15px;text-decoration:none;border-radius:8px;">Create Your Account &rarr;</a><p style="color:#9CA3AF;font-size:12px;">Or copy: <a href="${inviteUrl}" style="color:#1FB8A0;">${inviteUrl}</a><br/>Expires in 7 days.</p></div></body></html>`;
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: 'Port 24 <onboarding@resend.dev>', to: [email], subject: `You've been invited to Port 24 as ${roleLabel}`, html: emailHtml }),
        });
        const data = await res.json();
        if (res.ok) { emailSent = true; emailMethod = 'resend'; console.log(`[inviteWorkspaceUser] Email sent to ${email}, id: ${data.id}`); }
        else { emailError = data?.message || `Resend error ${res.status}`; console.warn('[inviteWorkspaceUser] Resend failed:', emailError); }
      } catch (e) { emailError = e.message; console.warn('[inviteWorkspaceUser] Resend threw:', e.message); }
    } else {
      emailError = 'RESEND_API_KEY not configured';
    }

    return Response.json({ success: true, email_sent: emailSent, email_error: emailError, email_method: emailMethod, invite_url: inviteUrl, message: emailSent ? `Invite sent to ${email}` : `Invite created. Share manually: ${inviteUrl}` });
  } catch (error) {
    console.error('[inviteWorkspaceUser] Fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});