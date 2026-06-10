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

    // Update status to disconnected
    await base44.asServiceRole.entities.StripeAccount.update(stripeAccount.id, {
      is_connected: false,
      stripe_charges_enabled: false,
      stripe_payouts_enabled: false
    });

    return Response.json({
      success: true,
      message: 'Stripe account disconnected'
    });
  } catch (error) {
    console.error('disconnectStripe error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});