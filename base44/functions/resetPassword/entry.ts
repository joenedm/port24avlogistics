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

    // Look up the token — filter by used=false only, then match token string in code
    // (filtering by token directly causes the SDK to hash it, breaking the lookup)
    let tokens = [];
    try {
      tokens = await base44.asServiceRole.entities.PasswordResetToken.filter({ used: false });
    } catch (err) {
      console.error('[resetPassword] Failed to query tokens:', err.message);
      return Response.json({ error: 'Invalid or expired reset link.' }, { status: 400 });
    }

    const tokenRecord = (tokens || []).find(t => t.reset_code === token);

    if (!tokenRecord) {
      console.log('[resetPassword] Token not found or already used:', token.substring(0, 8) + '...');
      return Response.json({ error: 'Invalid or expired reset link.' }, { status: 400 });
    }

    // Check expiry
    if (new Date(tokenRecord.expires_at) < new Date()) {
      console.log('[resetPassword] Token expired:', tokenRecord.expires_at);
      await base44.asServiceRole.entities.PasswordResetToken.update(tokenRecord.id, { used: true });
      return Response.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 400 });
    }

    // Update password via Base44 auth
    try {
      await base44.asServiceRole.auth.updateUserPassword(tokenRecord.user_id, new_password);
    } catch (err) {
      console.error('[resetPassword] Failed to update password:', err.message);
      return Response.json({ error: 'Failed to update password. Please try again.' }, { status: 500 });
    }

    // Mark token as used
    await base44.asServiceRole.entities.PasswordResetToken.update(tokenRecord.id, {
      used: true,
      used_at: new Date().toISOString(),
    });

    console.log(`[resetPassword] Password updated successfully for user ${tokenRecord.user_id}`);
    return Response.json({ success: true });

  } catch (error) {
    console.error('[resetPassword] Unexpected error:', error.message);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
});