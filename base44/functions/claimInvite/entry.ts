import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called after a user registers their account via the invite link.
// Matches their new account to the pending invite and assigns their role.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token is required.' }, { status: 400 });
    }

    // Must be called by an authenticated user (they just registered)
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'You must be signed in to claim an invite.' }, { status: 401 });
    }

    // Look up the invite
    const allInvites = await base44.asServiceRole.entities.PendingInvite.filter({ invite_token: token });
    const invite = allInvites?.[0];

    if (!invite) {
      return Response.json({ error: 'This invite link is invalid or has already been used.' }, { status: 400 });
    }
    if (invite.status === 'accepted') {
      return Response.json({ error: 'This invite has already been accepted. Please sign in normally.' }, { status: 400 });
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return Response.json({ error: 'This invite link has expired. Please ask your administrator for a new invite.' }, { status: 400 });
    }

    // Email must match
    if (user.email?.toLowerCase() !== invite.email?.toLowerCase()) {
      return Response.json({
        error: `This invite was sent to ${invite.email}. Please sign in with that email address.`,
      }, { status: 403 });
    }

    // Assign the correct role if different from current
    const platformRole = invite.role === 'admin' ? 'admin' : 'user';
    if (user.role !== platformRole) {
      await base44.asServiceRole.entities.User.update(user.id, { role: platformRole });
    }

    // Mark invite as accepted
    await base44.asServiceRole.entities.PendingInvite.update(invite.id, {
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      must_reset_password: false,
      temp_password_used: true,
    });

    return Response.json({ success: true, role: invite.role, email: invite.email });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});