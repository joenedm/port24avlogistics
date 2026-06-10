import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const { token } = await req.json();

  if (!token) {
    return Response.json({ error: 'Invalid or missing invitation link.' }, { status: 400 });
  }

  // createClientFromRequest with no user token still grants asServiceRole access
  const base44 = createClientFromRequest(req);

  // Find the token record
  let allTokens;
  try {
    allTokens = await base44.asServiceRole.entities.BookingConfirmationToken.filter({ token });
  } catch (err) {
    console.error('Token filter error:', err.message);
    return Response.json({ error: 'Token lookup failed: ' + err.message }, { status: 500 });
  }

  const tokenRecord = allTokens[0];

  if (!tokenRecord) {
    return Response.json({
      error: 'This invitation link is invalid or has expired. Please contact the project manager.'
    }, { status: 404 });
  }

  // Already used
  if (tokenRecord.used) {
    const booking = await base44.asServiceRole.entities.CrewBooking.get(tokenRecord.crew_booking_id).catch(() => null);
    function fmtDateAlready(str) {
      if (!str) return '';
      const d = new Date(str + (str.length === 10 ? 'T00:00:00' : ''));
      if (isNaN(d)) return str;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    const s = fmtDateAlready(booking?.start_date);
    const e = fmtDateAlready(booking?.end_date);
    const dr = s && e && s !== e ? `${s} – ${e}` : (s || e || '');
    return Response.json({
      success: true,
      already_used: true,
      action: tokenRecord.action_type,
      show_name: booking?.show_name || '',
      crew_name: booking?.crew_name || '',
      role: booking?.role || '',
      date_range: dr,
      message: tokenRecord.action_type === 'confirm'
        ? 'You have already confirmed this assignment.'
        : 'You have already declined this assignment.'
    });
  }

  const action = tokenRecord.action_type;

  let booking;
  try {
    booking = await base44.asServiceRole.entities.CrewBooking.get(tokenRecord.crew_booking_id);
  } catch {
    return Response.json({
      error: 'The booking associated with this link could not be found.'
    }, { status: 404 });
  }

  const newStatus = action === 'confirm' ? 'confirmed' : 'declined';

  await base44.asServiceRole.entities.CrewBooking.update(tokenRecord.crew_booking_id, {
    status: newStatus,
    responded_at: new Date().toISOString(),
  });

  if (booking.project_crew_id) {
    try {
      await base44.asServiceRole.entities.ProjectCrew.update(booking.project_crew_id, {
        assignment_status: newStatus,
        status_updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('ProjectCrew sync skipped:', err.message);
    }
  }

  await base44.asServiceRole.entities.BookingConfirmationToken.update(tokenRecord.id, {
    used: true,
    used_at: new Date().toISOString(),
  });

  // Format dates for display
  function fmtDate(str) {
    if (!str) return '';
    const d = new Date(str + (str.length === 10 ? 'T00:00:00' : ''));
    if (isNaN(d)) return str;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const fmtStart = fmtDate(booking.start_date);
  const fmtEnd = fmtDate(booking.end_date);
  const dateRange = fmtStart && fmtEnd && fmtStart !== fmtEnd
    ? `${fmtStart} – ${fmtEnd}`
    : (fmtStart || fmtEnd || '');

  return Response.json({
    success: true,
    action,
    show_name: booking.show_name || '',
    crew_name: booking.crew_name || '',
    role: booking.role || '',
    date_range: dateRange,
    message: action === 'confirm'
      ? `You are confirmed for ${booking.show_name || 'this project'}.`
      : `Your response has been recorded for ${booking.show_name || 'this project'}.`
  });
});