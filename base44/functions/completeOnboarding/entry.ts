import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const currentUser = await base44.auth.me();
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile } = await req.json();
    const email = currentUser.email;

    console.log('[Onboarding] Starting setup for:', email);

    // Load invite and user record in parallel
    const [allInvites, allUsers] = await Promise.all([
      base44.asServiceRole.entities.PendingInvite.list(),
      base44.asServiceRole.entities.User.list(),
    ]);

    const pendingInvite = allInvites.find(i => i.email?.toLowerCase() === email.toLowerCase());
    const existingRecord = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());

    console.log('[Onboarding] PendingInvite found:', !!pendingInvite, '| role:', pendingInvite?.role);
    console.log('[Onboarding] Existing User record found:', !!existingRecord, '| id:', existingRecord?.id);

    // Role MUST come from invite first, then existing record — never default to 'user'
    const assignedRole = pendingInvite?.role || existingRecord?.role;
    if (!assignedRole) {
      console.error('[Onboarding] No assigned role found for:', email);
      return Response.json({ error: 'No role assigned. Contact your administrator.' }, { status: 400 });
    }
    console.log('[Onboarding] Assigned role:', assignedRole);

    const payload = {
      full_name: profile.full_name || '',
      job_title: profile.job_title || '',
      username: profile.username || '',
      company: profile.company || '',
      phone: profile.phone || '',
      role: assignedRole,
      status: 'approved',
      setup_complete: true,
      approval_date: new Date().toISOString(),
    };

    let recordId;
    if (existingRecord) {
      // Always update existing record — never create duplicate
      await base44.asServiceRole.entities.User.update(existingRecord.id, payload);
      recordId = existingRecord.id;
      console.log('[Onboarding] Updated existing User record:', recordId, '| role set to:', assignedRole);
    } else {
      // No existing record — create one
      const created = await base44.asServiceRole.entities.User.create({ email, ...payload });
      recordId = created.id;
      console.log('[Onboarding] Created new User record:', recordId, '| role:', assignedRole);
    }

    // Clean up PendingInvite
    if (pendingInvite) {
      await base44.asServiceRole.entities.PendingInvite.delete(pendingInvite.id);
      console.log('[Onboarding] PendingInvite deleted:', pendingInvite.id);
    }

    console.log('[Onboarding] SUCCESS for:', email, '| role:', assignedRole, '| setup_complete: true');
    return Response.json({ success: true, recordId, role: assignedRole });
  } catch (error) {
    console.error('[Onboarding] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});