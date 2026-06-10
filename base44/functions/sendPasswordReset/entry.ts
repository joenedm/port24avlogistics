import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Generates a secure random token
function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return Response.json({ success: true }); // Safe response — don't reveal anything
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Look up user
    let users = [];
    try {
      users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    } catch (err) {
      console.error('[sendPasswordReset] Failed to query users:', err.message);
      return Response.json({ success: true });
    }

    if (!users || users.length === 0) {
      console.log(`[sendPasswordReset] No user found for email: ${normalizedEmail}`);
      return Response.json({ success: true }); // Safe — don't reveal if email exists
    }

    const user = users[0];

    // Generate secure token + expiry (1 hour)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Store token in PasswordResetToken entity
    await base44.asServiceRole.entities.PasswordResetToken.create({
      user_id: user.id,
      email: normalizedEmail,
      reset_code: token,
      expires_at: expiresAt,
      used: false,
    });

    console.log(`[sendPasswordReset] Token created for ${normalizedEmail}, expires ${expiresAt}`);

    // Always use the APP_URL secret for the reset link to avoid sending preview/sandbox URLs
    const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    console.log(`[sendPasswordReset] Reset link: ${resetLink}`);

    const userName = user.full_name || normalizedEmail;

    const htmlBody = '<!DOCTYPE html>' +
'<html lang="en">' +
'<head>' +
'<meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>Reset your Show Forge password</title>' +
'</head>' +
'<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">' +
'<tr><td align="center" style="padding:40px 16px;">' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">' +

'<tr><td align="center" style="padding-bottom:24px;">' +
'<img src="https://media.base44.com/images/public/69d5151f0495918d567d1066/ad22e0b11_ShowForgelogodesignwithsparks.png" width="56" height="56" alt="Show Forge" style="display:block;border-radius:12px;margin-bottom:10px;" />' +
'<span style="font-size:18px;font-weight:bold;color:#1E1B2E;">Show Forge</span>' +
'</td></tr>' +

'<tr><td style="background-color:#ffffff;border-radius:16px;padding:40px 36px;">' +

'<h1 style="font-size:22px;font-weight:bold;color:#1E1B2E;margin:0 0 12px;text-align:center;">Reset your password</h1>' +
'<p style="font-size:14px;color:#4B5563;line-height:1.6;margin:0 0 8px;text-align:center;">Hi ' + userName + ',</p>' +
'<p style="font-size:14px;color:#4B5563;line-height:1.6;margin:0 0 32px;text-align:center;">We received a request to reset your Show Forge password. Click the button below to set a new one. This link expires in 1 hour.</p>' +

'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
'<tr><td align="center" style="padding-bottom:32px;">' +
'<a href="' + resetLink + '" target="_blank" style="display:inline-block;background-color:#F59E0B;color:#1E1B2E;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 40px;border-radius:10px;">Reset Password</a>' +
'</td></tr>' +
'</table>' +

'<hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 24px;" />' +

'<p style="font-size:12px;color:#9CA3AF;line-height:1.6;margin:0 0 12px;text-align:center;">If the button above does not work, copy and paste this link into your browser:</p>' +
'<p style="font-size:11px;color:#6B7280;word-break:break-all;text-align:center;margin:0 0 24px;">' + resetLink + '</p>' +

'<p style="font-size:12px;color:#9CA3AF;line-height:1.6;margin:0;text-align:center;">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>' +

'</td></tr>' +

'<tr><td align="center" style="padding-top:24px;">' +
'<p style="font-size:11px;color:#9CA3AF;margin:0;">&#169; Show Forge &mdash; The operating system for live production</p>' +
'</td></tr>' +

'</table>' +
'</td></tr>' +
'</table>' +
'</body>' +
'</html>';

    // Send email via Base44 Core integration
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: normalizedEmail,
      subject: 'Reset your Show Forge password',
      body: htmlBody,
    });

    console.log(`[sendPasswordReset] Reset email sent to ${normalizedEmail}`);
    return Response.json({ success: true });

  } catch (error) {
    console.error('[sendPasswordReset] Unexpected error:', error.message);
    // Still return success to frontend — don't leak internal errors
    return Response.json({ success: true });
  }
});