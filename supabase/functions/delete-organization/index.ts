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

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) throw new Error('Unauthorized');

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify caller is platform admin using service role (bypasses RLS)
    const { data: callerProfile } = await adminClient.from('users').select('is_platform_admin').eq('id', caller.id).single();
    if (!callerProfile?.is_platform_admin) throw new Error('Access denied. Platform admin only.');

    const { org_id } = await req.json();
    if (!org_id) throw new Error('org_id is required');

    // Get all users in this org so we can delete them from auth too
    const { data: orgUsers } = await adminClient.from('users').select('id').eq('org_id', org_id);

    // Delete the organization — all related data cascades automatically via FK ON DELETE CASCADE
    const { error: deleteOrgErr } = await adminClient.from('organizations').delete().eq('id', org_id);
    if (deleteOrgErr) throw deleteOrgErr;

    // Delete each user from Supabase Auth (not covered by cascade)
    for (const u of orgUsers ?? []) {
      await adminClient.auth.admin.deleteUser(u.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
