import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller || caller.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email, password, full_name, role, company } = await req.json();
    if (!email || !password || !role) {
      return Response.json({ error: 'email, password, and role are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Step 1: Register the new user account
    try {
      await base44.auth.register({ email, password, full_name: full_name || '' });
    } catch (registerErr) {
      const msg = registerErr.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
        return Response.json({ error: 'A user with this email already exists.' }, { status: 409 });
      }
      return Response.json({ error: 'Failed to create account: ' + msg }, { status: 500 });
    }

    // Step 2: Wait briefly, then update role/profile
    try {
      await new Promise(r => setTimeout(r, 1000));
      const allUsers = await base44.asServiceRole.entities.User.list();
      const newUser = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (newUser) {
        await base44.asServiceRole.entities.User.update(newUser.id, {
          role,
          full_name: full_name || '',
          company: company || '',
          status: 'approved',
        });
      }
    } catch (updateErr) {
      console.warn('[createWorkspaceUser] Role update failed:', updateErr.message);
    }

    // Step 3: Trigger OTP resend so the verification code email goes out fresh
    // (Base44 register() already sends one, but resend ensures it's current)
    try {
      await base44.auth.resendOtp(email);
      console.log('[createWorkspaceUser] OTP resent to:', email);
    } catch (otpErr) {
      console.warn('[createWorkspaceUser] resendOtp failed (non-fatal):', otpErr.message);
    }

    // Step 4: Send the Account Ready email with credentials + instructions
    const appUrl = (Deno.env.get('APP_URL') || 'https://port24avlogistics.base44.app').replace(/\/+$/, '');
    const loginUrl = `${appUrl}/signin`;
    const verifyUrl = `${appUrl}/verify-email?email=${encodeURIComponent(email)}`;

    const emailResult = await sendAccountReadyEmail({ base44, email, password, full_name, role, loginUrl, verifyUrl });

    return Response.json({
      success: true,
      email_sent: emailResult.sent,
      email_error: emailResult.error || null,
      login_url: loginUrl,
    });

  } catch (error) {
    console.error('[createWorkspaceUser] Fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendAccountReadyEmail({ base44, email, password, full_name, role, loginUrl, verifyUrl }) {
  const ROLE_LABELS = { admin: 'Admin', director: 'Director', manager: 'Manager', coordinator: 'Coordinator', crew: 'Crew' };
  const roleLabel = ROLE_LABELS[role] || role;
  const firstName = full_name ? full_name.split(' ')[0] : null;
  const greeting = firstName ? `Hi ${firstName}!` : 'Hi there!';

  const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 12px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.10);">

      <!-- Top accent bar -->
      <tr><td style="height:5px;background:linear-gradient(135deg,#1FB8A0,#3DC9C0);"></td></tr>

      <!-- Body -->
      <tr><td style="padding:36px 36px 12px;">

        <!-- Label -->
        <p style="color:#1FB8A0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin:0 0 10px;">PORT 24 — ACCOUNT READY</p>

        <!-- Greeting -->
        <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 10px;line-height:1.3;">${greeting}</h1>
        <p style="color:#4B5563;font-size:14px;line-height:1.7;margin:0 0 24px;">
          Your Port 24 workspace account has been created with the role <strong style="color:#111827;">${roleLabel}</strong>.<br>
          Use the credentials below to sign in.
        </p>

        <!-- ─── Credentials Box ─── -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:2px solid #E5E7EB;border-radius:10px;margin-bottom:12px;">

          <!-- Email row -->
          <tr>
            <td style="padding:14px 18px;border-bottom:1px solid #E5E7EB;">
              <p style="margin:0 0 3px;font-size:10px;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;font-weight:600;">Email / Username</p>
              <p style="margin:0;font-size:15px;font-weight:700;color:#111827;word-break:break-all;">${email}</p>
            </td>
          </tr>

          <!-- Password row -->
          <tr>
            <td style="padding:14px 18px;border-bottom:1px solid #E5E7EB;">
              <p style="margin:0 0 3px;font-size:10px;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;font-weight:600;">Password</p>
              <p style="margin:0;font-size:17px;font-weight:700;color:#111827;font-family:Courier New,Courier,monospace;letter-spacing:.12em;background:#F3F4F6;display:inline-block;padding:4px 10px;border-radius:4px;">${password}</p>
            </td>
          </tr>

          <!-- Sign-In URL row -->
          <tr>
            <td style="padding:14px 18px;">
              <p style="margin:0 0 3px;font-size:10px;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;font-weight:600;">Sign-In URL</p>
              <a href="${loginUrl}" style="margin:0;font-size:13px;color:#1FB8A0;word-break:break-all;text-decoration:none;">${loginUrl}</a>
            </td>
          </tr>

        </table>

        <!-- Verification notice box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;margin-bottom:24px;">
          <tr>
            <td style="padding:14px 18px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#92400E;">⚠️ Email Verification Required</p>
              <p style="margin:0;font-size:13px;color:#78350F;line-height:1.6;">
                A separate email with your <strong>6-digit verification code</strong> has been sent to <strong>${email}</strong> by the system.<br>
                Check your inbox (and spam folder) for that code — you will need it on the next screen after signing in.
              </p>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <table cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
          <tr>
            <td style="border-radius:8px;background:#1FB8A0;">
              <a href="${loginUrl}" style="display:inline-block;padding:14px 40px;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;letter-spacing:.02em;">Sign In to Port 24 →</a>
            </td>
          </tr>
        </table>

        <!-- Secondary link -->
        <p style="font-size:12px;color:#9CA3AF;margin:0 0 24px;">
          Or go directly to the verification page:<br>
          <a href="${verifyUrl}" style="color:#1FB8A0;word-break:break-all;">${verifyUrl}</a>
        </p>

        <!-- Steps -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;margin-bottom:24px;">
          <tr>
            <td style="padding:14px 18px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.08em;">How to Sign In</p>
              <p style="margin:0 0 4px;font-size:13px;color:#15803D;line-height:1.7;">
                1. Click <strong>Sign In to Port 24</strong> above<br>
                2. Enter your email and password<br>
                3. Check your inbox for the <strong>6-digit verification code</strong><br>
                4. Enter the code on the verification screen<br>
                5. You're in!
              </p>
            </td>
          </tr>
        </table>

      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:0 36px 28px;">
        <p style="color:#D1D5DB;font-size:11px;margin:0;line-height:1.7;border-top:1px solid #F3F4F6;padding-top:16px;">
          You can change your password any time from your profile settings.<br>
          Having trouble? Contact your workspace administrator.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  const RESEND_KEY = Deno.env.get('RESEND_API_KEY');

  let fromEmail = null;
  let fromName = 'Port 24';
  try {
    const settings = await base44.asServiceRole.entities.WorkspaceEmailSettings.list();
    if (settings?.length > 0 && settings[0].from_email) {
      fromEmail = settings[0].from_email;
      fromName = settings[0].from_name || 'Port 24';
    }
  } catch (e) { console.warn('[sendAccountReadyEmail] Could not fetch email settings:', e.message); }

  if (RESEND_KEY) {
    const senders = fromEmail
      ? [`${fromName} <${fromEmail}>`, 'Port 24 <onboarding@resend.dev>']
      : ['Port 24 <onboarding@resend.dev>'];

    for (const from of senders) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to: [email], subject: 'Your Port 24 account is ready — action required', html: emailHtml }),
        });
        if (res.ok) {
          console.log('[sendAccountReadyEmail] Sent via Resend from:', from);
          return { sent: true };
        }
        const d = await res.json();
        console.warn('[sendAccountReadyEmail] Resend failed with', from, ':', d?.message);
      } catch (e) {
        console.warn('[sendAccountReadyEmail] Resend threw with', from, ':', e.message);
      }
    }
  }

  // Fallback: Core integration
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: 'Your Port 24 account is ready — action required',
      body: emailHtml,
    });
    console.log('[sendAccountReadyEmail] Sent via Core integration');
    return { sent: true };
  } catch (e) {
    console.warn('[sendAccountReadyEmail] Core email also failed:', e.message);
    return { sent: false, error: 'Email delivery failed. Share credentials manually.' };
  }
}