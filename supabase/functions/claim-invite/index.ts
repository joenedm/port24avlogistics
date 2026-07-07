import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', 'qwerty123',
  'abc12345', 'iloveyou', 'admin123', 'letmein1', 'welcome1', 'monkey123',
]);

function validatePasswordStrength(pw: string): string | null {
  if (!pw || pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(pw)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(pw)) return 'Password must contain at least one number.';
  if (COMMON_PASSWORDS.has(pw.toLowerCase())) return 'Password is too common. Please choose a stronger one.';
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Use service role for all DB operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { token, full_name, password } = await req.json();
    if (!token) throw new Error('Missing invite token');

    // Load invite (no status filter — handle all states explicitly below)
    const { data: invite, error: invErr } = await adminClient
      .from('pending_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (invErr || !invite) throw new Error('Invite not found');
    if (new Date(invite.expires_at) < new Date()) throw new Error('Invite expired');

    // Try to identify caller as an authenticated user
    let user = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const anonClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user: authUser } } = await anonClient.auth.getUser();
      user = authUser; // null if called with anon key or no session
    }

    // ── Create-account mode ──────────────────────────────────────────────
    // No authenticated user but a password was provided — create the account
    // server-side (auto-confirmed) so the client can sign in immediately.
    if (!user && password) {
      // Server-side password strength check
      const pwError = validatePasswordStrength(password);
      if (pwError) {
        return new Response(JSON.stringify({ error: 'weak_password', message: pwError }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Email match guard — the invite email must match what we're creating
      if (!invite.email) throw new Error('Invite has no email address.');

      const { data: { user: newUser }, error: createErr } = await adminClient.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || invite.full_name || '' },
      });

      if (createErr) {
        // User already exists — tell the client to use Sign In instead
        const msg = createErr.message?.toLowerCase() ?? '';
        if (msg.includes('already') || (createErr as any).status === 422) {
          return new Response(JSON.stringify({
            error: 'user_exists',
            message: 'This email already has a Port 24 account. Please sign in instead.',
          }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        throw createErr;
      }

      user = newUser;
    }

    if (!user) throw new Error('Unauthorized');

    // Email match guard
    if (invite.email && invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      throw new Error('This invite was sent to a different email address.');
    }

    const isPlatformAdmin = invite.role === 'platform_admin';
    const userRole = isPlatformAdmin ? 'admin' : invite.role;

    // ── Idempotent path: invite already accepted ─────────────────────────
    if (invite.status !== 'pending') {
      const { data: existingProfile } = await adminClient
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        await adminClient.from('users').upsert({
          id: user.id,
          email: user.email,
          full_name: full_name || invite.full_name || user.user_metadata?.full_name || '',
          org_id: invite.org_id,
          role: userRole,
          is_platform_admin: isPlatformAdmin,
        }, { onConflict: 'id' });
      }

      if (invite.org_id) {
        await adminClient.from('company_memberships').upsert({
          user_id: user.id,
          org_id: invite.org_id,
          role: userRole,
          status: 'active',
        }, { onConflict: 'user_id,org_id' });
      }

      return new Response(JSON.stringify({ ok: true, org_id: invite.org_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Normal pending claim ─────────────────────────────────────────────
    const { error: upsertErr } = await adminClient.from('users').upsert({
      id: user.id,
      email: user.email,
      full_name: full_name || invite.full_name || user.user_metadata?.full_name || '',
      org_id: invite.org_id,
      role: userRole,
      is_platform_admin: isPlatformAdmin,
    }, { onConflict: 'id' });

    if (upsertErr) throw upsertErr;

    if (invite.org_id) {
      const { error: memberErr } = await adminClient.from('company_memberships').upsert({
        user_id: user.id,
        org_id: invite.org_id,
        role: userRole,
        status: 'active',
      }, { onConflict: 'user_id,org_id' });

      if (memberErr) throw memberErr;
    }

    await adminClient.from('pending_invites').update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    }).eq('id', invite.id);

    return new Response(JSON.stringify({ ok: true, org_id: invite.org_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
