import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    // Verify the caller is a real authenticated user
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !user) throw new Error('Unauthorized');

    const { token, full_name } = await req.json();
    if (!token) throw new Error('Missing invite token');

    // Use service role to bypass RLS for all DB operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Load invite (no status filter — handle all states explicitly below)
    const { data: invite, error: invErr } = await adminClient
      .from('pending_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (invErr || !invite) throw new Error('Invite not found');
    if (new Date(invite.expires_at) < new Date()) throw new Error('Invite expired');

    // Email match — the invitee must sign in with the invited email
    if (invite.email && invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      throw new Error('This invite was sent to a different email address.');
    }

    const isPlatformAdmin = invite.role === 'platform_admin';
    const userRole = isPlatformAdmin ? 'admin' : invite.role;

    // If already accepted — idempotent path: ensure the users row + membership exist
    if (invite.status !== 'pending') {
      const { data: existingProfile } = await adminClient
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        // Invite was accepted but this user has no profile — something went wrong earlier.
        // Re-create the users row and membership so they can get in.
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

    // Normal pending invite claim
    const { error: upsertErr } = await adminClient.from('users').upsert({
      id: user.id,
      email: user.email,
      full_name: full_name || invite.full_name || user.user_metadata?.full_name || '',
      org_id: invite.org_id,
      role: userRole,
      is_platform_admin: isPlatformAdmin,
    }, { onConflict: 'id' });

    if (upsertErr) throw upsertErr;

    // Upsert company_membership
    if (invite.org_id) {
      const { error: memberErr } = await adminClient.from('company_memberships').upsert({
        user_id: user.id,
        org_id: invite.org_id,
        role: userRole,
        status: 'active',
      }, { onConflict: 'user_id,org_id' });

      if (memberErr) throw memberErr;
    }

    // Mark invite accepted
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
