import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function generateToken() {
  return crypto.getRandomValues(new Uint8Array(32)).reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { crewBookingId, templateId, testEmail } = await req.json();

    // Fetch crew booking
    const crewBooking = await base44.entities.CrewBooking.filter({ id: crewBookingId });
    if (!crewBooking.length) {
      return Response.json({ error: 'Crew booking not found' }, { status: 404 });
    }
    const booking = crewBooking[0];

    // Fetch template
    let template = null;
    if (templateId) {
      const templates = await base44.entities.EmailTemplate.filter({ id: templateId });
      template = templates[0];
    }

    // Fetch brand settings
    const brands = await base44.entities.BrandSettings.list();
    const branding = brands[0] || {};

    // Fetch visible fields
    const fieldControls = await base44.entities.EmailFieldControl.filter({ is_visible: true });

    // Generate confirm and decline tokens
    const confirmToken = generateToken();
    const declineToken = generateToken();

    // Create tokens in database
    await base44.entities.BookingConfirmationToken.bulkCreate([
      {
        crew_booking_id: crewBookingId,
        crew_email: testEmail || booking.crew_email || booking.crew_phone,
        token: confirmToken,
        action_type: 'confirm',
        created_at: new Date().toISOString()
      },
      {
        crew_booking_id: crewBookingId,
        crew_email: testEmail || booking.crew_email || booking.crew_phone,
        token: declineToken,
        action_type: 'decline',
        created_at: new Date().toISOString()
      }
    ]);

    // Generate email HTML with working buttons
    const html = generateBookingEmail(booking, branding, fieldControls, confirmToken, declineToken);

    // Send email
    const recipientEmail = testEmail || booking.crew_email || booking.crew_phone;
    await base44.integrations.Core.SendEmail({
      to: recipientEmail,
      subject: `Crew Booking Confirmation - ${booking.show_name || 'Your Project'}`,
      body: html
    });

    return Response.json({ success: true, message: 'Booking email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateBookingEmail(booking, branding, fieldControls, confirmToken, declineToken) {
  const baseUrl = Deno.env.get('APP_URL') || 'https://app.example.com';
  const confirmUrl = `${baseUrl}/booking-confirmation?token=${confirmToken}`;
  const declineUrl = `${baseUrl}/booking-confirmation?token=${declineToken}`;

  const headerColor = branding?.email_header_text_color || '#ffffff';
  const footerBgColor = branding?.email_footer_background_color || '#f9fafb';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header {
      background-color: ${branding?.email_header_background_color || '#2563eb'};
      padding: 30px;
      text-align: center;
      color: ${headerColor};
    }
    .header img { max-height: 50px; margin-bottom: 15px; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .content h2 { margin: 0 0 15px 0; font-size: 18px; color: #333; }
    .details-box {
      margin: 20px 0;
      padding: 15px;
      background-color: #f9fafb;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    .detail-row {
      margin: 0 0 8px 0;
      color: #666;
      font-size: 14px;
    }
    .detail-row strong { display: inline-block; width: 100px; }
    .actions {
      text-align: center;
      margin: 30px 0;
    }
    .btn {
      display: inline-block;
      padding: 12px 30px;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      margin-right: 15px;
    }
    .btn-confirm { background-color: #10b981; }
    .btn-decline { background-color: #ef4444; }
    .footer {
      background-color: ${footerBgColor};
      padding: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
    .footer p { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      ${branding?.email_header_show_logo !== false && branding?.email_header_logo_url
        ? `<img src="${branding.email_header_logo_url}" alt="Logo" />`
        : ''
      }
      <h1>Crew Booking Confirmation</h1>
    </div>

    <!-- Content -->
    <div class="content">
      <h2>You have been invited to join a booking</h2>
      
      <div class="details-box">
        ${booking.show_name ? `<div class="detail-row"><strong>Project:</strong> ${booking.show_name}</div>` : ''}
        ${booking.start_date ? `<div class="detail-row"><strong>Start:</strong> ${booking.start_date}</div>` : ''}
        ${booking.end_date ? `<div class="detail-row"><strong>End:</strong> ${booking.end_date}</div>` : ''}
        ${booking.rate ? `<div class="detail-row"><strong>Rate:</strong> $${booking.rate}</div>` : ''}
        ${booking.accommodation ? `<div class="detail-row"><strong>Accommodation:</strong> ${booking.accommodation}</div>` : ''}
      </div>

      <div class="actions">
        <a href="${confirmUrl}" class="btn btn-confirm">✓ Confirm</a>
        <a href="${declineUrl}" class="btn btn-decline">✗ Decline</a>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      ${branding?.email_footer_show_company_name !== false && branding?.company_name
        ? `<p><strong>${branding.company_name}</strong></p>`
        : ''
      }
      <p>
        ${branding?.email_footer_show_phone !== false && branding?.company_phone
          ? branding.company_phone
          : ''
        }
        ${branding?.email_footer_show_phone !== false && branding?.company_phone && branding?.email_footer_show_email !== false && branding?.company_email
          ? ' • '
          : ''
        }
        ${branding?.email_footer_show_email !== false && branding?.company_email
          ? branding.company_email
          : ''
        }
      </p>
    </div>
  </div>
</body>
</html>
  `;
}