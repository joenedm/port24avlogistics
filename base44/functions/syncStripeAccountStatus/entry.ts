import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const stripeAccounts = await base44.asServiceRole.entities.StripeAccount.list();
    
    if (!stripeAccounts.length) {
      return Response.json({ error: 'No Stripe account connected' }, { status: 404 });
    }

    const stripeAccount = stripeAccounts[0];

    if (!stripeAccount.is_connected || !stripeAccount.stripe_account_id) {
      return Response.json({ 
        error: 'Stripe not connected',
        status: 'not_connected'
      }, { status: 400 });
    }

    // Fetch current account status from Stripe
    const stripeClientId = Deno.env.get('STRIPE_CLIENT_ID');
    const stripeClientSecret = Deno.env.get('STRIPE_CLIENT_SECRET');

    // For service role access, we need to use Restricted API keys
    // This is a limitation - ideally we'd store the refresh token but Stripe doesn't provide it for Connect
    // For now, sync is manual or requires re-auth

    return Response.json({
      success: true,
      message: 'Stripe status sync requires reconnection due to OAuth scope limitations',
      account: {
        id: stripeAccount.id,
        stripe_account_id: stripeAccount.stripe_account_id,
        is_connected: stripeAccount.is_connected,
        charges_enabled: stripeAccount.stripe_charges_enabled,
        payouts_enabled: stripeAccount.stripe_payouts_enabled,
        account_name: stripeAccount.account_name
      }
    });
  } catch (error) {
    console.error('syncStripeAccountStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});