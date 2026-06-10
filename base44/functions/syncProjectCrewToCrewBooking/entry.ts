import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Sync ProjectCrew → CrewBooking
 * Triggered by entity automation on ProjectCrew create/update.
 * Automation payload: { event: { entity_id, type }, data: {...} }
 * Also supports direct invocation with { projectCrewId }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both entity automation payload and direct invocation
    const projectCrewId = body.projectCrewId || body.event?.entity_id || body.data?.id;

    if (!projectCrewId) {
      return Response.json({ error: 'projectCrewId required' }, { status: 400 });
    }

    console.log('[SyncProjectCrew] Processing projectCrewId:', projectCrewId);

    // Use automation-supplied data if available, otherwise fetch
    let projectCrew = (body.data?.id === projectCrewId) ? body.data : null;
    if (!projectCrew) {
      const list = await base44.asServiceRole.entities.ProjectCrew.list();
      projectCrew = list.find(pc => pc.id === projectCrewId);
    }

    if (!projectCrew) {
      return Response.json({ error: 'ProjectCrew not found' }, { status: 404 });
    }

    // Find linked CrewBooking
    let crewBooking = null;
    if (projectCrew.crew_booking_id) {
      const bookings = await base44.asServiceRole.entities.CrewBooking.list();
      crewBooking = bookings.find(b => b.id === projectCrew.crew_booking_id) || null;
    }

    // If not linked, try to match by show + crew + role + date
    if (!crewBooking) {
      const bookings = await base44.asServiceRole.entities.CrewBooking.filter({
        show_id: projectCrew.show_id,
        crew_id: projectCrew.crew_member_id,
        role: projectCrew.role,
        start_date: projectCrew.assignment_date,
      });
      crewBooking = bookings[0] || null;
    }

    if (crewBooking) {
      // Update existing CrewBooking
      await base44.asServiceRole.entities.CrewBooking.update(crewBooking.id, {
        role: projectCrew.role,
        start_date: projectCrew.assignment_date,
        start_time: projectCrew.start_time,
        end_time: projectCrew.end_time,
        location: projectCrew.location,
        rate_type: projectCrew.rate_type,
        rate: projectCrew.billable_rate || projectCrew.internal_rate,
        notes: projectCrew.notes,
        status: mapAssignmentStatusToBookingStatus(projectCrew.assignment_status),
      });
      console.log('[SyncProjectCrew] Updated CrewBooking:', crewBooking.id);
      return Response.json({ success: true, action: 'updated', crewBookingId: crewBooking.id });
    } else {
      // Create new CrewBooking
      const newBooking = await base44.asServiceRole.entities.CrewBooking.create({
        show_id: projectCrew.show_id,
        show_name: projectCrew.show_name,
        crew_id: projectCrew.crew_member_id,
        crew_name: projectCrew.crew_member_name,
        crew_email: projectCrew.crew_member_email,
        crew_phone: '',
        project_crew_id: projectCrew.id,
        role: projectCrew.role,
        status: mapAssignmentStatusToBookingStatus(projectCrew.assignment_status),
        start_date: projectCrew.assignment_date,
        start_time: projectCrew.start_time,
        end_time: projectCrew.end_time,
        location: projectCrew.location,
        rate: projectCrew.billable_rate || projectCrew.internal_rate,
        rate_type: projectCrew.rate_type,
        notes: projectCrew.notes,
      });

      // Link ProjectCrew back to new CrewBooking
      await base44.asServiceRole.entities.ProjectCrew.update(projectCrewId, {
        crew_booking_id: newBooking.id,
      });

      console.log('[SyncProjectCrew] Created CrewBooking:', newBooking.id);
      return Response.json({ success: true, action: 'created', crewBookingId: newBooking.id });
    }
  } catch (error) {
    console.error('[SyncProjectCrew] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function mapAssignmentStatusToBookingStatus(assignmentStatus) {
  const map = {
    not_sent: 'not_sent',
    pending: 'pending',
    confirmed: 'confirmed',
    declined: 'declined',
  };
  return map[assignmentStatus] || 'not_sent';
}