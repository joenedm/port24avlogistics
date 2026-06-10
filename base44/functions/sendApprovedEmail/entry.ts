import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { templateId, showId, personId, recipientEmail } = await req.json();

    if (!templateId || !recipientEmail) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch template
    const templates = await base44.entities.EmailTemplate.filter({ id: templateId });
    if (!templates.length) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }
    const template = templates[0];

    // Fetch show if provided
    let show = null;
    if (showId) {
      const shows = await base44.entities.Show.filter({ id: showId });
      show = shows[0];
    }

    // Fetch branding
    const brands = await base44.entities.BrandSettings.list();
    const branding = brands[0] || {};

    // Build email data
    const emailData = {
      project_name: show?.name || '',
      date: show?.start_date || '',
      location: show?.venue || '',
    };

    // Fetch visible fields
    const fieldControls = await base44.entities.EmailFieldControl.filter({ is_visible: true });

    // Generate email HTML
    const html = generateEmailHTML(template, branding, fieldControls, emailData);

    // Send email
    await base44.integrations.Core.SendEmail({
      to: recipientEmail,
      subject: template.subject_line || 'Email Notification',
      body: html
    });

    return Response.json({ 
      success: true, 
      message: 'Email sent successfully',
      sentTo: recipientEmail 
    });
  } catch (error) {
    console.error('Error sending approved email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateEmailHTML(template, branding, fieldControls, emailData) {
  const headerBgColor = branding?.email_header_background_color || '#2563eb';
  const headerTextColor = branding?.email_header_text_color || '#ffffff';
  const footerBgColor = branding?.email_footer_background_color || '#f9fafb';
  const footerTextColor = branding?.email_footer_text_color || '#6b7280';

  // Render template sections
  const sectionsHtml = template.sections?.map(section => {
    switch (section.type) {
      case 'heading':
        return `<h2 style="font-size: 18px; margin: 15px 0; color: #333; text-align: ${section.alignment || 'left'};">${section.content || ''}</h2>`;
      case 'paragraph':
        return `<p style="font-size: 14px; margin: 10px 0; color: #666; text-align: ${section.alignment || 'left'};">${section.content || ''}</p>`;
      case 'button':
        return `<a href="${section.content || '#'}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0;">${section.label || 'Click Here'}</a>`;
      case 'divider':
        return `<hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />`;
      case 'spacer':
        return `<div style="height: 20px;"></div>`;
      case 'image':
        return `<img src="${section.content || ''}" style="max-width: 100%; height: auto; margin: 10px 0;" />`;
      default:
        return '';
    }
  }).join('') || '';

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
      background-color: ${headerBgColor};
      padding: 30px;
      text-align: center;
      color: ${headerTextColor};
    }
    .header img { max-height: 50px; margin-bottom: 15px; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
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
      <h1>${template.template_name || 'Email Notification'}</h1>
    </div>

    <!-- Content -->
    <div class="content">
      ${sectionsHtml}
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