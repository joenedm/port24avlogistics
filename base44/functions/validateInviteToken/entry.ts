import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Public endpoint — no auth required. Validates the token and returns invite info.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token is required.' }, { status: 400 });
    }

    const allInvites = await base44.asServiceRole.entities.PendingInvite.filter({ invite_token: token });
    const invite = allInvites?.[0];

    if (!invite) {
      return Response.json({ error: 'This invite link is invalid or has already been used. Please contact your administrator.' }, { status: 404 });
    }
    if (invite.status === 'accepted') {
      return Response.json({ error: 'This invite has already been accepted. Please sign in to access your workspace.' }, { status: 400 });
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return Response.json({ error: 'This invite link has expired. Please ask your administrator to resend the invite.' }, { status: 400 });
    }

    // Return safe public info only
    return Response.json({
      success: true,
      email: invite.email,
      full_name: invite.full_name || '',
      role: invite.role || 'crew',
    });

  } catch (error) {
    return Response.json({ error: 'Unable to verify invite. Please try again or contact your administrator.' }, { status: 500 });
  }
});