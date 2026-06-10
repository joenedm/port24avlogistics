import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { branding, visibleFields, testEmail } = await req.json();

    if (!testEmail) {
      return Response.json({ error: 'Test email required' }, { status: 400 });
    }

    // Generate Gmail-compatible HTML
    const html = generateGmailCompatibleEmail(branding, visibleFields);

    // Send test email
    await base44.integrations.Core.SendEmail({
      to: testEmail,
      subject: 'Test Email - Crew Assignment',
      body: html
    });

    return Response.json({ success: true, message: 'Test email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateGmailCompatibleEmail(branding, visibleFields) {
  const getHeaderStyle = () => {
    const type = branding?.email_header_background_type || 'solid';
    let background = '';

    if (type === 'image') {
      background = `background-image: url('${branding?.email_header_background_url}'); background-size: cover; background-position: center;`;
    } else if (type === 'gradient') {
      background = `background: ${branding?.email_header_background_gradient};`;
    } else {
      background = `background-color: ${branding?.email_header_background_color || '#2563eb'};`;
    }

    return background;
  };

  const headerColor = branding?.email_header_text_color || '#ffffff';
  const footerBgColor = branding?.email_footer_background_color || '#f9fafb';
  const footerTextColor = branding?.email_footer_text_color || '#6b7280';

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
      ${getHeaderStyle()}
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
      color: ${footerTextColor};
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
      <h1>Crew Assignment</h1>
    </div>

    <!-- Content -->
    <div class="content">
      <h2>You have been assigned to a project</h2>
      
      <div class="details-box">
        ${visibleFields.includes('project_name') ? '<div class="detail-row"><strong>Project:</strong> Sample Project Name</div>' : ''}
        ${visibleFields.includes('crew_name') ? '<div class="detail-row"><strong>Crew:</strong> John Doe</div>' : ''}
        ${visibleFields.includes('role') ? '<div class="detail-row"><strong>Role:</strong> Audio Technician</div>' : ''}
        ${visibleFields.includes('date') ? '<div class="detail-row"><strong>Date:</strong> April 15, 2026</div>' : ''}
        ${visibleFields.includes('start_time') ? '<div class="detail-row"><strong>Start:</strong> 9:00 AM</div>' : ''}
        ${visibleFields.includes('end_time') ? '<div class="detail-row"><strong>End:</strong> 6:00 PM</div>' : ''}
        ${visibleFields.includes('location') ? '<div class="detail-row"><strong>Location:</strong> Convention Center</div>' : ''}
        ${visibleFields.includes('cost') ? '<div class="detail-row"><strong>Pay:</strong> $1,200</div>' : ''}
      </div>

      <div class="actions">
        <a href="#" class="btn btn-confirm">✓ Confirm</a>
        <a href="#" class="btn btn-decline">✗ Decline</a>
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