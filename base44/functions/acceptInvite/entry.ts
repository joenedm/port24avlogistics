import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, new_password } = await req.json();

    if (!token || !new_password) {
      return Response.json({ error: 'Token and new password are required.' }, { status: 400 });
    }

    if (new_password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    // Look up the invite token (service role so no auth needed yet)
    const allInvites = await base44.asServiceRole.entities.PendingInvite.filter({ invite_token: token });
    const invite = allInvites?.[0];

    if (!invite) {
      return Response.json({ error: 'Invalid or expired invite link.' }, { status: 400 });
    }
    if (invite.status === 'accepted') {
      return Response.json({ error: 'This invite has already been used. Please sign in normally.' }, { status: 400 });
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return Response.json({ error: 'This invite link has expired. Please ask your administrator to resend.' }, { status: 400 });
    }

    // Find the user by email
    const users = await base44.asServiceRole.entities.User.filter({ email: invite.email });
    const targetUser = users?.[0];

    if (!targetUser) {
      return Response.json({ error: 'User account not found. Make sure you have accepted the platform email invitation first.' }, { status: 404 });
    }

    // Set the new password
    await base44.asServiceRole.auth.updateUserPassword(targetUser.id, new_password);

    // Mark invite as accepted
    await base44.asServiceRole.entities.PendingInvite.update(invite.id, {
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      must_reset_password: false,
      temp_password_plain: '',
      temp_password_used: true,
    });

    return Response.json({ success: true, email: invite.email });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});