import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const authCode = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!authCode) {
      return Response.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const stripeClientId = Deno.env.get('STRIPE_CLIENT_ID');
    const stripeClientSecret = Deno.env.get('STRIPE_CLIENT_SECRET');
    const appUrl = Deno.env.get('APP_URL');

    if (!stripeClientSecret) {
      return Response.json({ error: 'Stripe configuration missing' }, { status: 500 });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: stripeClientId,
        client_secret: stripeClientSecret
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Stripe OAuth error:', error);
      return Response.json({ error: 'Stripe authorization failed', details: error }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    const stripeAccountId = tokenData.stripe_user_id;

    if (!stripeAccountId) {
      return Response.json({ error: 'Invalid Stripe response' }, { status: 400 });
    }

    // Fetch account details from Stripe
    const accountResponse = await fetch(`https://api.stripe.com/v1/accounts/${stripeAccountId}`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Stripe-Version': '2023-10-16'
      }
    });

    if (!accountResponse.ok) {
      console.error('Failed to fetch Stripe account');
      return Response.json({ error: 'Failed to fetch account details' }, { status: 400 });
    }

    const accountDetails = await accountResponse.json();

    // Check if StripeAccount exists, if not create it
    const existingAccounts = await base44.asServiceRole.entities.StripeAccount.list();
    let stripeAccountRecord = existingAccounts[0];

    const accountData = {
      stripe_account_id: stripeAccountId,
      account_name: accountDetails.business_profile?.name || accountDetails.email,
      email: accountDetails.email,
      is_connected: true,
      connected_at: new Date().toISOString(),
      connected_by: user.email,
      payment_page_enabled: true,
      customer_portal_enabled: true,
      default_payment_method: 'all',
      stripe_charges_enabled: accountDetails.charges_enabled || false,
      stripe_payouts_enabled: accountDetails.payouts_enabled || false,
      stripe_default_currency: accountDetails.default_currency || 'usd'
    };

    if (stripeAccountRecord) {
      await base44.asServiceRole.entities.StripeAccount.update(stripeAccountRecord.id, accountData);
    } else {
      stripeAccountRecord = await base44.asServiceRole.entities.StripeAccount.create(accountData);
    }

    // Redirect back to admin page with success
    return Response.redirect(`${appUrl}/admin?tab=billing&stripe_connected=true`, 302);
  } catch (error) {
    console.error('handleStripeOAuthCallback error:', error);
    const appUrl = Deno.env.get('APP_URL');
    return Response.redirect(`${appUrl}/admin?tab=billing&stripe_error=${encodeURIComponent(error.message)}`, 302);
  }
});