import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { QB_TOKEN_URL } from '../_shared/qbHelpers.ts';

serve(async (req) => {
  const reqUrl = new URL(req.url);
  const code = reqUrl.searchParams.get('code');
  const state = reqUrl.searchParams.get('state');
  const realmId = reqUrl.searchParams.get('realmId');
  const errParam = reqUrl.searchParams.get('error');

  const port24Url = Deno.env.get('PORT24_URL') || 'https://port24avlogistics.vercel.app';
  const failUrl = `${port24Url}/quickbooks-callback?qb_callback=error`;

  if (errParam || !code || !state || !realmId) {
    return Response.redirect(failUrl, 302);
  }

  try {
    const { org_id } = JSON.parse(atob(state));

    const clientId = Deno.env.get('INTUIT_CLIENT_ID')!;
    const clientSecret = Deno.env.get('INTUIT_CLIENT_SECRET')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const callbackUrl = `${supabaseUrl}/functions/v1/qbOAuthCallback`;
    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    const tokenRes = await fetch(QB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
      }),
    });

    if (!tokenRes.ok) {
      console.error('QB token exchange failed:', await tokenRes.text());
      return Response.redirect(failUrl, 302);
    }

    const tokens = await tokenRes.json();

    const adminClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await adminClient
      .from('quickbooks_connections')
      .upsert({
        org_id,
        realm_id: realmId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        connected_at: new Date().toISOString(),
        last_sync_at: null,
        last_sync_status: null,
        last_sync_error: null,
      }, { onConflict: 'org_id' });

    return Response.redirect(`${port24Url}/quickbooks-callback?qb_callback=success`, 302);
  } catch (err) {
    console.error('QB OAuth callback error:', err);
    return Response.redirect(failUrl, 302);
  }
});
