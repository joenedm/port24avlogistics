import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// This function is now a no-op passthrough.
// The external QuickBooks Sync Service handles all OAuth token exchange.
// Port 24 just reads the qb_callback=success/error param from the redirect URL.
// This function is kept for backward compatibility but does nothing.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return Response.json({
      message: 'OAuth is handled by the external QuickBooks Sync Service. Check qb_callback param in the return URL.'
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});