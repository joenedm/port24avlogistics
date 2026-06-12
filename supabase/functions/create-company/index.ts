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

    // Create the organization
    const { data: org, error: orgErr } = await adminClient
      .from('organizations')
      .insert({ name: name.trim() })
      .select()
      .single();

    if (orgErr) throw orgErr;

    // Set the user's org_id and role
    const { error: userUpdateErr } = await adminClient
      .from('users')
      .update({ org_id: org.id, role: 'admin' })
      .eq('id', user.id);

    if (userUpdateErr) throw userUpdateErr;

    // Insert company_membership
    await adminClient.from('company_memberships').insert({
      user_id: user.id,
      org_id: org.id,
      role: 'admin',
      status: 'active',
    });

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
