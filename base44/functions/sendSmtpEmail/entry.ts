import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Central email router with reliable fallback chain:
// 1. Resend with custom verified domain (if configured + RESEND_API_KEY present)
// 2. Resend with default onboarding sender (always works with a valid API key)
// 3. Core.SendEmail (platform default — always available)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { to, subject, body, from_name } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'to, subject, and body are required' }, { status: 400 });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    // Load workspace email settings (optional — for custom from address)
    let smtp = null;
    try {
      const settings = await base44.asServiceRole.entities.WorkspaceEmailSettings.list();
      smtp = settings?.[0] || null;
    } catch (e) {
      console.warn('[sendSmtpEmail] Could not load WorkspaceEmailSettings:', e.message);
    }

    // ── ATTEMPT 1: Resend with custom verified domain ──────────────────────
    if (RESEND_API_KEY && smtp?.from_email && smtp.from_email !== smtp?.smtp_username) {
      const senderName = from_name || smtp.from_name || 'Port 24';
      const fromAddress = `${senderName} <${smtp.from_email}>`;

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from: fromAddress, to: [to], subject, html: body }),
        });

        const data = await res.json();

        if (!res.ok) {
          // Domain not verified or other Resend error — log and fall through
          console.warn(`[sendSmtpEmail] Resend custom domain failed (${res.status}): ${data?.message} — trying fallback`);
        } else {
          console.log(`[sendSmtpEmail] Sent via Resend (custom) from ${fromAddress} to ${to}`);
          return Response.json({ success: true, method: 'resend_custom', id: data.id });
        }
      } catch (e) {
        console.warn('[sendSmtpEmail] Resend custom domain attempt threw:', e.message, '— trying fallback');
      }
    }

    // ── ATTEMPT 2: Resend with default onboarding sender ──────────────────
    // This always works as long as the API key is valid (no domain verification needed)
    if (RESEND_API_KEY) {
      const displayName = from_name || smtp?.from_name || 'Port 24';
      const defaultFrom = `${displayName} <onboarding@resend.dev>`;

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from: defaultFrom, to: [to], subject, html: body }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.warn(`[sendSmtpEmail] Resend default sender failed (${res.status}): ${data?.message} — trying Core fallback`);
        } else {
          console.log(`[sendSmtpEmail] Sent via Resend (default sender) to ${to}`);
          return Response.json({ success: true, method: 'resend_default', id: data.id });
        }
      } catch (e) {
        console.warn('[sendSmtpEmail] Resend default sender threw:', e.message, '— trying Core fallback');
      }
    }

    // ── ATTEMPT 3: Core.SendEmail (platform default, always available) ─────
    console.log(`[sendSmtpEmail] Using Core.SendEmail fallback for ${to}`);
    await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      subject,
      body,
      from_name: from_name || smtp?.from_name || 'Port 24',
    });

    return Response.json({ success: true, method: 'core' });

  } catch (error) {
    console.error('[sendSmtpEmail] All send attempts failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});