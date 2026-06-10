import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Admin-only access
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const hasClientId = !!Deno.env.get('QB_CLIENT_ID');
    const hasClientSecret = !!Deno.env.get('QB_CLIENT_SECRET');
    const hasRedirectUri = !!Deno.env.get('QB_REDIRECT_URI');
    const redirectUri = Deno.env.get('QB_REDIRECT_URI');
    
    const hasOldClientId = !!Deno.env.get('QUICKBOOKS_CLIENT_ID');
    const hasOldClientSecret = !!Deno.env.get('QUICKBOOKS_CLIENT_SECRET');
    const hasAppUrl = !!Deno.env.get('APP_URL');

    return Response.json({
      secrets: {
        'QB_CLIENT_ID': hasClientId ? 'present' : 'missing',
        'QB_CLIENT_SECRET': hasClientSecret ? 'present' : 'missing',
        'QB_REDIRECT_URI': hasRedirectUri ? 'present' : 'missing',
      },
      deprecated_secrets: {
        'QUICKBOOKS_CLIENT_ID': hasOldClientId ? 'present (legacy)' : 'not set',
        'QUICKBOOKS_CLIENT_SECRET': hasOldClientSecret ? 'present (legacy)' : 'not set',
        'APP_URL': hasAppUrl ? 'present (legacy)' : 'not set',
      },
      configured_redirect_uri: redirectUri || 'not configured',
      all_secrets_present: hasClientId && hasClientSecret && hasRedirectUri,
      backend_function: 'qbInitiateOAuth / qbHandleOAuthCallback',
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});