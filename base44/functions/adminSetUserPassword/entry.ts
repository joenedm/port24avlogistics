import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller || caller.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();
    if (!email) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify user exists
    const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found.' }, { status: 404 });
    }
    const targetUser = users[0];

    // Generate a reset token valid for 24 hours
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.PasswordResetToken.create({
      user_id: targetUser.id,
      email: normalizedEmail,
      reset_code: token,
      expires_at: expiresAt,
      used: false,
    });

    const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    console.log(`[adminSetUserPassword] Reset link generated for ${normalizedEmail}: ${resetLink}`);
    return Response.json({ success: true, reset_url: resetLink });
  } catch (error) {
    console.error('[adminSetUserPassword]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});