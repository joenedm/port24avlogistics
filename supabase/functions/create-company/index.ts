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

    // Verify caller is a real authenticated user
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !user) throw new Error('Unauthorized');

    const { name } = await req.json();
    if (!name?.trim()) throw new Error('Company name is required');

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Gate: user must already exist in public.users (i.e. they were invited).
    // This prevents anyone with a raw Supabase JWT (e.g. fresh Google OAuth) from
    // calling this endpoint directly and creating a company without an invite.
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();
    if (!existingUser) throw new Error('No account found. You need an invite link to access Port 24.');

    // Create the organization
    const { data: org, error: orgErr } = await adminClient
      .from('organizations')
      .insert({ name: name.trim() })
      .select()
      .single();

    if (orgErr) throw orgErr;

    // UPSERT (not just update) so we create the public.users row if it doesn't exist yet.
    const { error: userUpdateErr } = await adminClient
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        org_id: org.id,
        role: 'admin',
      }, { onConflict: 'id' });

    if (userUpdateErr) throw userUpdateErr;

    // Insert company_membership
    const { error: membershipErr } = await adminClient
      .from('company_memberships')
      .upsert({
        user_id: user.id,
        org_id: org.id,
        role: 'admin',
        status: 'active',
      }, { onConflict: 'user_id,org_id' });

    if (membershipErr) throw membershipErr;

    return new Response(JSON.stringify({ ok: true, org_id: org.id, org }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
