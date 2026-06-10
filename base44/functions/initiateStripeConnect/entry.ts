import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
    const stripeClientId = Deno.env.get('STRIPE_CLIENT_ID');

    if (!stripeClientId) {
      return Response.json({ error: 'Stripe Client ID not configured' }, { status: 500 });
    }

    // Redirect URI must be registered in Stripe dashboard
    const redirectUri = `${appUrl}/api/stripe-oauth-callback`;
    const state = crypto.randomUUID();

    const stripeConnectUrl = new URL('https://connect.stripe.com/oauth/authorize');
    stripeConnectUrl.searchParams.set('client_id', stripeClientId);
    stripeConnectUrl.searchParams.set('state', state);
    stripeConnectUrl.searchParams.set('redirect_uri', redirectUri);
    stripeConnectUrl.searchParams.set('stripe_user[url]', appUrl);

    return Response.json({
      redirect_url: stripeConnectUrl.toString()
    });
  } catch (error) {
    console.error('initiateStripeConnect error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});