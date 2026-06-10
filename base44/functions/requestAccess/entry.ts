import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * requestAccess — called from /register page
 * Creates (or updates) a User record with status = "pending"
 */
Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { full_name, email, company } = body;

    if (!full_name || !email || !company) {
      return Response.json({ error: 'full_name, email, and company are required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Check if user record already exists
    const allUsers = await base44.asServiceRole.entities.User.list();
    const existing = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (existing) {
      if (existing.status === 'approved') {
        return Response.json({ error: 'This email already has an approved account.' }, { status: 409 });
      }
      // Re-submit: update name/company, reset to pending
      await base44.asServiceRole.entities.User.update(existing.id, {
        full_name,
        company,
        status: 'pending',
      });
      return Response.json({ success: true, action: 'updated' });
    }

    // Create new pending record
    await base44.asServiceRole.entities.User.create({
      full_name,
      email,
      company,
      status: 'pending',
      onboarding_complete: false,
    });

    return Response.json({ success: true, action: 'created' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});