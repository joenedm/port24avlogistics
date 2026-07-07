import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'no-reply@port24.io';
const FROM_NAME = Deno.env.get('FROM_NAME') ?? 'Port 24';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory rate limiter: max 5 reset requests per email per 10 minutes
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

const T = '#1FB8A0';
const BG = '#070B11';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email, redirect_to } = await req.json();
    if (!email) throw new Error('Missing email');

    // Rate limit by email address (case-normalized)
    const emailKey = email.trim().toLowerCase();
    if (!checkRateLimit(emailKey)) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const redirectTo = redirect_to || `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '') ?? ''}/reset-password`;

    // Generate a password recovery link via admin API
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim().toLowerCase(),
      options: { redirectTo },
    });

    if (linkErr) {
      // Don't expose whether the email exists — just silently succeed
      console.error('[send-password-reset] generateLink error:', linkErr.message);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resetLink = linkData.properties?.action_link;
    if (!resetLink) throw new Error('Failed to generate reset link');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:${BG};font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG};padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:11px;font-weight:800;letter-spacing:0.18em;color:${T};">PORT 24</span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background-color:#0D1219;border:1px solid rgba(31,184,160,0.15);border-radius:16px;padding:40px;">

          <!-- Heading -->
          <p style="color:${T};font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 16px;">Password Reset</p>
          <h1 style="color:#ffffff;font-size:22px;font-weight:800;line-height:1.3;margin:0 0 12px;">Reset your password</h1>
          <p style="color:#7B8EA8;font-size:14px;line-height:1.6;margin:0 0 28px;">
            We received a request to reset the password for your Port 24 account. Click the button below to choose a new password.
          </p>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="background-color:${T};border-radius:10px;">
              <a href="${resetLink}" style="display:inline-block;padding:14px 28px;color:#070B11;font-size:14px;font-weight:700;text-decoration:none;">
                Reset Password →
              </a>
            </td></tr>
          </table>

          <!-- Fallback -->
          <p style="color:#4B5563;font-size:12px;line-height:1.6;margin:0 0 8px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color:${T};font-size:11px;word-break:break-all;margin:0 0 28px;">${resetLink}</p>

          <!-- Divider -->
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:0 0 20px;">

          <p style="color:#4B5563;font-size:12px;line-height:1.6;margin:0;">
            If you didn't request a password reset, you can safely ignore this email. This link expires in 1 hour.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="color:#374151;font-size:11px;margin:0;">Port 24 AV Logistics · <a href="https://port24avlogistics.online" style="color:#374151;">port24avlogistics.online</a></p>
        </td></tr>

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
        to: [email.trim().toLowerCase()],
        subject: 'Reset your Port 24 password',
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend error ${res.status}: ${body}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-password-reset]', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
