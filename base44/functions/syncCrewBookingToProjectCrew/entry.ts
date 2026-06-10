import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Sync CrewBooking to ProjectCrew
 * When a CrewBooking is created/updated with a selected show_id,
 * create or update the matching ProjectCrew record.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { crewBookingId } = await req.json();

    if (!crewBookingId) {
      return Response.json({ error: 'crewBookingId required' }, { status: 400 });
    }

    // Get the CrewBooking
    const bookings = await base44.entities.CrewBooking.list();
    const booking = bookings.find(b => b.id === crewBookingId);

    if (!booking) {
      return Response.json({ error: 'CrewBooking not found' }, { status: 404 });
    }

    // If no show selected, skip sync
    if (!booking.show_id) {
      return Response.json({ success: false, reason: 'No show_id on booking' });
    }

    // Check if ProjectCrew already exists and is linked
    let projectCrew = null;
    if (booking.project_crew_id) {
      const projectCrewList = await base44.entities.ProjectCrew.list();
      projectCrew = projectCrewList.find(pc => pc.id === booking.project_crew_id);
    }

    // If not linked, try to find matching ProjectCrew by show + role + crew + date
    if (!projectCrew) {
      const projectCrewList = await base44.entities.ProjectCrew.filter({
        show_id: booking.show_id,
        role: booking.role,
        crew_member_id: booking.crew_id,
        assignment_date: booking.start_date,
      });
      projectCrew = projectCrewList[0] || null;
    }

    // Calculate costs (if rate exists)
    let internalCost = 0;
    let billableCost = 0;

    if (booking.rate && booking.rate_type === 'hourly') {
      // Assume 8-hour day if start/end times not provided
      const hours = (booking.start_time && booking.end_time)
        ? calculateHours(booking.start_time, booking.end_time)
        : 8;
      billableCost = booking.rate * hours * (booking.quantity || 1);
      internalCost = billableCost * 0.6; // Estimate internal as 60% of billable
    } else if (booking.rate && booking.rate_type === 'daily') {
      billableCost = booking.rate * (booking.quantity || 1);
      internalCost = billableCost * 0.6;
    } else if (booking.rate && booking.rate_type === 'fixed') {
      billableCost = booking.rate;
      internalCost = billableCost * 0.6;
    }

    if (projectCrew) {
      // Update existing
      await base44.entities.ProjectCrew.update(projectCrew.id, {
        role: booking.role,
        assignment_date: booking.start_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        location: booking.location,
        rate_type: booking.rate_type,
        billable_rate: booking.rate,
        internal_rate: booking.rate * 0.6,
        billable_cost: billableCost,
        internal_cost: internalCost,
        notes: booking.notes,
        assignment_status: mapBookingStatusToAssignmentStatus(booking.status),
      });
      return Response.json({ success: true, action: 'updated', projectCrewId: projectCrew.id });
    } else {
      // Create new
      const newProjectCrew = await base44.entities.ProjectCrew.create({
        show_id: booking.show_id,
        show_name: booking.show_name,
        crew_member_id: booking.crew_id,
        crew_member_name: booking.crew_name,
        crew_member_email: booking.crew_email,
        project_crew_id: booking.project_crew_id,
        role: booking.role,
        assignment_date: booking.start_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        location: booking.location,
        rate_type: booking.rate_type,
        billable_rate: booking.rate,
        internal_rate: booking.rate * 0.6,
        billable_cost: billableCost,
        internal_cost: internalCost,
        notes: booking.notes,
        assignment_status: mapBookingStatusToAssignmentStatus(booking.status),
        quantity: booking.quantity || 1,
      });

      // Update booking with new ProjectCrew link
      await base44.entities.CrewBooking.update(crewBookingId, {
        project_crew_id: newProjectCrew.id,
      });

      return Response.json({ success: true, action: 'created', projectCrewId: newProjectCrew.id });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateHours(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em - sh * 60 - sm) / 60;
}

function mapBookingStatusToAssignmentStatus(bookingStatus) {
  const map = {
    'not_sent': 'not_sent',
    'pending': 'pending',
    'confirmed': 'confirmed',
    'declined': 'declined',
    'cancelled': 'declined',
  };
  return map[bookingStatus] || 'not_sent';
}