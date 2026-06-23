import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'invites@port24.io';
const FROM_NAME = Deno.env.get('FROM_NAME') ?? 'Port 24';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { to_email, to_name, invite_link, org_name, role, invited_by_name, invite_type } = await req.json();

    const displayName = to_name || to_email.split('@')[0];
    const isCompanyAdmin = invite_type === 'company_admin';
    const roleLabel = isCompanyAdmin
      ? 'Workspace Admin'
      : role
        ? role.charAt(0).toUpperCase() + role.slice(1)
        : 'Team Member';

    const headingLabel = isCompanyAdmin ? "You're invited to set up a workspace" : "You're Invited";
    const heroTitle = isCompanyAdmin
      ? `Set Up Your ${org_name || 'Company'} Workspace on Port 24`
      : `Join ${org_name || 'your team'} on Port 24`;
    const bodyText = isCompanyAdmin
      ? `${invited_by_name ? `<strong style="color:#fff;">${invited_by_name}</strong> has set up a workspace for` : 'A workspace has been created for'} <strong style="color:#fff;">${org_name || 'your company'}</strong> on Port 24. As <strong style="color:#1FB8A0;">Workspace Admin</strong>, you'll manage your team, inventory, and shows.`
      : `${invited_by_name ? `<strong style="color:#fff;">${invited_by_name}</strong> has invited you` : "You've been invited"} to join <strong style="color:#fff;">${org_name || 'your workspace'}</strong> on Port 24 as a <strong style="color:#1FB8A0;">${roleLabel}</strong>.`;
    const ctaText = isCompanyAdmin ? 'Set Up Your Workspace →' : 'Accept Invite &amp; Set Up Account →';
    const emailSubject = isCompanyAdmin
      ? `Set up your ${org_name || 'company'} workspace on Port 24`
      : `You've been invited to join ${org_name || 'Port 24'}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've been invited to Port 24</title>
</head>
<body style="margin:0;padding:0;background:#0E1117;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0E1117;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#131920;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);">

        <!-- Header -->
        <tr>
          <td style="background:#0B0F18;padding:28px 40px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:10px;">
                <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4h10v4H8v8H4V4z" fill="#3DC9C0"/>
                  <path d="M36 4h-10v4h8v8h4V4z" fill="#1FB8A0"/>
                  <path d="M4 36h10v-4H8v-8H4V36z" fill="#3DC9C0"/>
                  <path d="M36 36h-10v-4h8v-8h4V36z" fill="#1FB8A0"/>
                </svg>
              </td>
              <td>
                <span style="font-size:13px;font-weight:800;letter-spacing:0.15em;color:#3DC9C0;">PORT <span style="color:#1FB8A0;">24</span></span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">

            <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#1FB8A0;">${headingLabel}</p>
            <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;">
              ${heroTitle}
            </h1>
            <p style="margin:0 0 24px;font-size:15px;color:#7B8EA8;line-height:1.6;">
              Hi ${displayName},<br/><br/>
              ${bodyText}
            </p>

            <!-- What is Port 24 blurb -->
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
              <tr>
                <td style="background:#0D1219;border:1px solid rgba(31,184,160,0.12);border-radius:12px;padding:20px 24px;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#1FB8A0;">About Port 24</p>
                  <p style="margin:0;font-size:13px;color:#7B8EA8;line-height:1.6;">
                    Production management built for AV &amp; event teams — gear inventory, crew scheduling, quotes, invoices, and show logistics all in one place.
                  </p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="${invite_link}" style="display:inline-block;background:#1FB8A0;color:#070B11;font-weight:700;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.02em;">
                    ${ctaText}
                  </a>
                </td>
              </tr>
            </table>

            <!-- Expiry note -->
            <p style="margin:0 0 24px;font-size:12px;color:#4A5568;text-align:center;">
              This invite link expires in <strong style="color:#7B8EA8;">7 days</strong>. If you weren't expecting this, you can safely ignore this email.
            </p>

            <!-- Divider -->
            <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:0 0 24px;" />

            <!-- Fallback link -->
            <p style="margin:0;font-size:11px;color:#4A5568;line-height:1.6;">
              If the button doesn't work, copy and paste this link into your browser:<br/>
              <a href="${invite_link}" style="color:#1FB8A0;word-break:break-all;">${invite_link}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0B0F18;padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0;font-size:11px;color:#374151;text-align:center;">
              © ${new Date().getFullYear()} Port 24 · Production management for AV &amp; event teams
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to_email],
        subject: emailSubject,
        html,
      }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Resend error');

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
