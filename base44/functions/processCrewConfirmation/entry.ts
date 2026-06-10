import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, action } = await req.json();

    if (!token || !action) {
      return Response.json({ success: false, message: 'Missing token or action' }, { status: 400 });
    }

    // Try CrewAssignmentToken first (for ProjectCrew confirmations)
    let tokenRecord = null;
    let tokenType = null;

    const assignmentTokens = await base44.asServiceRole.entities.CrewAssignmentToken.filter({
      token: token,
      used: false
    });

    if (assignmentTokens && assignmentTokens.length > 0) {
      tokenRecord = assignmentTokens[0];
      tokenType = 'assignment';
    } else {
      // Try BookingConfirmationToken (for CrewBooking confirmations)
      const bookingTokens = await base44.asServiceRole.entities.BookingConfirmationToken.filter({
        token: token,
        used: false
      });

      if (bookingTokens && bookingTokens.length > 0) {
        tokenRecord = bookingTokens[0];
        tokenType = 'booking';
      }
    }

    if (!tokenRecord) {
      return Response.json({ success: false, message: 'Invalid or expired token' }, { status: 404 });
    }

    // Check expiration
    if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
      return Response.json({ success: false, message: 'Token has expired' }, { status: 400 });
    }

    // Verify action matches token
    if (tokenRecord.action_type !== action) {
      return Response.json({ success: false, message: 'Invalid action' }, { status: 400 });
    }

    let assignment = null;

    if (tokenType === 'assignment') {
      // Handle ProjectCrew confirmation
      assignment = await base44.asServiceRole.entities.ProjectCrew.get(tokenRecord.crew_assignment_id);
      if (!assignment) {
        return Response.json({ success: false, message: 'Assignment not found' }, { status: 404 });
      }

      const newStatus = action === 'confirm' ? 'confirmed' : 'declined';
      await base44.asServiceRole.entities.ProjectCrew.update(assignment.id, {
        assignment_status: newStatus,
        status_updated_at: new Date().toISOString(),
        confirmed_by: tokenRecord.crew_email
      });

      // Mark token as used
      await base44.asServiceRole.entities.CrewAssignmentToken.update(tokenRecord.id, {
        used: true,
        used_at: new Date().toISOString(),
        used_by: tokenRecord.crew_email
      });

      // Also update linked CrewBooking if it exists
      if (assignment.crew_booking_id) {
        const cbStatus = action === 'confirm' ? 'confirmed' : 'declined';
        await base44.asServiceRole.entities.CrewBooking.update(assignment.crew_booking_id, {
          status: cbStatus,
          responded_at: new Date().toISOString()
        });
      }
    } else if (tokenType === 'booking') {
      // Handle CrewBooking confirmation
      const booking = await base44.asServiceRole.entities.CrewBooking.get(tokenRecord.crew_booking_id);
      if (!booking) {
        return Response.json({ success: false, message: 'Booking not found' }, { status: 404 });
      }

      const newStatus = action === 'confirm' ? 'confirmed' : 'declined';
      await base44.asServiceRole.entities.CrewBooking.update(booking.id, {
        status: newStatus,
        responded_at: new Date().toISOString()
      });

      // Mark token as used
      await base44.asServiceRole.entities.BookingConfirmationToken.update(tokenRecord.id, {
        used: true,
        used_at: new Date().toISOString()
      });

      // Also update linked ProjectCrew if it exists
      if (booking.project_crew_id) {
        const pcStatus = action === 'confirm' ? 'confirmed' : 'declined';
        await base44.asServiceRole.entities.ProjectCrew.update(booking.project_crew_id, {
          assignment_status: pcStatus,
          status_updated_at: new Date().toISOString(),
          confirmed_by: tokenRecord.crew_email
        });
      }

      assignment = booking;
    }

    return Response.json({
      success: true,
      message: 'Confirmation processed',
      assignment: assignment
    });
  } catch (error) {
    console.error('Confirmation error:', error);
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
});