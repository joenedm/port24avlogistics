/**
 * Shared email rendering utility
 * Used by both frontend preview and backend sending
 */

export function generateCrewInviteEmail(template, branding, emailData, confirmUrl, declineUrl) {
  if (!template) {
    throw new Error('Email template is required');
  }

  const headerBgColor = branding?.email_header_background_color || '#2563eb';
  const headerTextColor = branding?.email_header_text_color || '#ffffff';
  const footerBgColor = branding?.email_footer_background_color || '#f9fafb';
  const footerTextColor = branding?.email_footer_text_color || '#6b7280';

  // Build info card rows, only showing fields with values
  const infoRows = [
    { label: 'Project', value: emailData.project_name },
    { label: 'Crew Member', value: emailData.crew_name },
    { label: 'Role', value: emailData.role },
    { label: 'Date', value: emailData.date },
    { label: 'Start Time', value: emailData.start_time },
    { label: 'End Time', value: emailData.end_time },
    { label: 'Location', value: emailData.location },
    { label: 'Pay', value: emailData.cost },
  ].filter(row => row.value);

  const infoRowsHtml = infoRows
    .map(row => `
      <div style="margin: 8px 0; font-size: 14px; color: #333;">
        <strong>${row.label}:</strong> ${row.value}
      </div>
    `)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    .email-container { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      background-color: ${headerBgColor};
      color: ${headerTextColor};
      padding: 40px 30px;
      text-align: center;
    }
    .header img { 
      max-height: 60px; 
      margin-bottom: 20px;
      display: block;
    }
    .header h1 { 
      font-size: 28px;
      font-weight: 600;
      margin: 0;
    }
    .content { 
      padding: 40px 30px;
    }
    .intro {
      font-size: 16px;
      color: #555;
      margin-bottom: 30px;
      line-height: 1.5;
    }
    .info-card {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .actions {
      text-align: center;
      margin: 40px 0;
      display: flex;
      gap: 15px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-block;
      padding: 14px 40px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 6px;
      text-align: center;
      transition: background-color 0.2s;
      border: none;
      cursor: pointer;
      min-width: 160px;
    }
    .btn-confirm { 
      background-color: #10b981;
      color: white;
    }
    .btn-confirm:hover { 
      background-color: #059669;
    }
    .btn-decline { 
      background-color: #ef4444;
      color: white;
    }
    .btn-decline:hover { 
      background-color: #dc2626;
    }
    .footer {
      background-color: ${headerBgColor};
      color: ${headerTextColor};
      padding: 30px;
      text-align: center;
      font-size: 12px;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 4px 0;
    }
    .footer-divider {
      margin: 0 8px;
      display: inline;
    }
    @media (max-width: 600px) {
      .content { padding: 20px 15px; }
      .header { padding: 30px 15px; }
      .btn { 
        padding: 12px 30px;
        font-size: 14px;
        min-width: 120px;
      }
      .actions {
        flex-direction: column;
        gap: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- HEADER -->
    <div class="header">
      ${branding?.email_header_show_logo !== false && branding?.email_header_logo_url
        ? `<img src="${branding.email_header_logo_url}" alt="Company Logo" />`
        : ''
      }
      <h1>Crew Assignment</h1>
    </div>

    <!-- CONTENT -->
    <div class="content">
      <div class="intro">
        You have been assigned to a project. Please confirm or decline below.
      </div>

      <div class="info-card">
        ${infoRowsHtml}
      </div>

      <div class="actions">
        <a href="${confirmUrl}" class="btn btn-confirm">✓ Confirm</a>
        <a href="${declineUrl}" class="btn btn-decline">✗ Decline</a>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      ${branding?.company_name ? `<p><strong>${branding.company_name}</strong></p>` : ''}
      ${branding?.company_email || branding?.company_phone
        ? `<p>
            ${branding?.company_phone ? branding.company_phone : ''}
            ${branding?.company_phone && branding?.company_email ? '<span class="footer-divider">•</span>' : ''}
            ${branding?.company_email ? branding.company_email : ''}
          </p>`
        : ''
      }
    </div>
  </div>
</body>
</html>
  `;
}