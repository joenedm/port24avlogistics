import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { nanoid } from 'https://deno.land/x/nanoid/mod.ts';

const renderHeaderHtml = (brand) => {
  const logoPosition = brand.email_header_logo_position || 'top';
  let backgroundStyle = `background-color: ${brand.email_header_background_color || '#2563eb'};`;
  
  if (brand.email_header_background_type === 'image') {
    backgroundStyle = `background-image: url(${brand.email_header_background_url}); background-size: cover; background-position: center;`;
  } else if (brand.email_header_background_type === 'gradient') {
    backgroundStyle = `background: ${brand.email_header_background_gradient};`;
  }

  const textColor = brand.email_header_text_color || 'white';
  let headerContent = '';

  if (logoPosition === 'top') {
    if (brand.email_header_show_logo && brand.email_header_logo_url) {
      headerContent += `<div style="text-align: ${brand.email_header_alignment || 'center'}; margin-bottom: 15px;"><img src="${brand.email_header_logo_url}" alt="Logo" style="max-height: 50px;"></div>`;
    }
  } else if (logoPosition.startsWith('inline')) {
    const inlineAlign = logoPosition === 'inline_left' ? 'left' : logoPosition === 'inline_center' ? 'center' : 'right';
    const flexAlign = logoPosition === 'inline_left' ? 'flex-start' : logoPosition === 'inline_center' ? 'center' : 'flex-end';
    
    headerContent += `<div style="display: flex; align-items: center; justify-content: ${flexAlign}; gap: 15px;">`;
    if (logoPosition === 'inline_left' && brand.email_header_show_logo && brand.email_header_logo_url) {
      headerContent += `<img src="${brand.email_header_logo_url}" alt="Logo" style="max-height: 50px;">`;
    }
    if (logoPosition === 'inline_center' && brand.email_header_show_logo && brand.email_header_logo_url) {
      headerContent += `<img src="${brand.email_header_logo_url}" alt="Logo" style="max-height: 50px;">`;
    }
    if (logoPosition === 'inline_right' && brand.email_header_show_logo && brand.email_header_logo_url) {
      headerContent += `<img src="${brand.email_header_logo_url}" alt="Logo" style="max-height: 50px;">`;
    }
    
    if (brand.email_header_show_social && (brand.email_header_social_instagram || brand.email_header_social_facebook || brand.email_header_social_linkedin)) {
      headerContent += `<div style="text-align: ${inlineAlign}; font-size: 16px;">`;
      if (brand.email_header_social_instagram) {
        headerContent += `<a href="${brand.email_header_social_instagram}" style="color: ${textColor}; margin-right: 12px; text-decoration: none;">📷</a>`;
      }
      if (brand.email_header_social_facebook) {
        headerContent += `<a href="${brand.email_header_social_facebook}" style="color: ${textColor}; margin-right: 12px; text-decoration: none;">f</a>`;
      }
      if (brand.email_header_social_linkedin) {
        headerContent += `<a href="${brand.email_header_social_linkedin}" style="color: ${textColor}; text-decoration: none;">in</a>`;
      }
      headerContent += `</div>`;
    }
    
    headerContent += `</div>`;
  }

  if (brand.email_header_show_social && logoPosition === 'top' && (brand.email_header_social_instagram || brand.email_header_social_facebook || brand.email_header_social_linkedin)) {
    headerContent += `<div style="text-align: ${brand.email_header_alignment || 'center'}; font-size: 16px;">`;
    if (brand.email_header_social_instagram) {
      headerContent += `<a href="${brand.email_header_social_instagram}" style="color: ${textColor}; margin-right: 12px; text-decoration: none;">📷</a>`;
    }
    if (brand.email_header_social_facebook) {
      headerContent += `<a href="${brand.email_header_social_facebook}" style="color: ${textColor}; margin-right: 12px; text-decoration: none;">f</a>`;
    }
    if (brand.email_header_social_linkedin) {
      headerContent += `<a href="${brand.email_header_social_linkedin}" style="color: ${textColor}; text-decoration: none;">in</a>`;
    }
    headerContent += `</div>`;
  }

  return `<tr><td style="${backgroundStyle} padding: 30px; text-align: ${brand.email_header_alignment || 'center'}; color: ${textColor};">${headerContent}</td></tr>`;
};

const renderFooterHtml = (brand) => {
  const textAlign = brand.email_footer_alignment === 'left' ? 'left' : 'center';
  let backgroundStyle = `background-color: ${brand.email_footer_background_color || '#f9fafb'};`;
  
  if (brand.email_footer_background_type === 'image') {
    backgroundStyle = `background-image: url(${brand.email_footer_background_url}); background-size: cover; background-position: center;`;
  } else if (brand.email_footer_background_type === 'gradient') {
    backgroundStyle = `background: ${brand.email_footer_background_gradient};`;
  }

  const textColor = brand.email_footer_text_color || '#6b7280';

  let footerContent = '';

  if (brand.email_footer_show_logo && brand.email_footer_logo_url) {
    footerContent += `<div style="text-align: ${textAlign}; margin-bottom: 15px;"><img src="${brand.email_footer_logo_url}" alt="Logo" style="max-height: 35px;"></div>`;
  }

  if (brand.email_footer_show_company_name && brand.company_name) {
    footerContent += `<p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; text-align: ${textAlign};">${brand.company_name}</p>`;
  }

  footerContent += `<div style="text-align: ${textAlign}; margin-bottom: 15px; line-height: 1.6; font-size: 13px;">`;
  
  if (brand.email_footer_show_phone && brand.company_phone) {
    footerContent += `<p style="margin: 0 0 5px 0;"><a href="tel:${brand.company_phone}" style="color: ${textColor}; text-decoration: none;">📱 ${brand.company_phone}</a></p>`;
  }
  
  if (brand.email_footer_show_email && brand.company_email) {
    footerContent += `<p style="margin: 0 0 5px 0;"><a href="mailto:${brand.company_email}" style="color: ${textColor}; text-decoration: none;">✉ ${brand.company_email}</a></p>`;
  }
  
  if (brand.email_footer_show_website && brand.company_website) {
    const displayUrl = brand.company_website.replace(/^https?:\/\//, '');
    footerContent += `<p style="margin: 0 0 5px 0;"><a href="${brand.company_website}" style="color: ${textColor}; text-decoration: none;">🌐 ${displayUrl}</a></p>`;
  }
  
  if (brand.email_footer_show_address && brand.company_address) {
    footerContent += `<p style="margin: 0; white-space: pre-wrap;">📍 ${brand.company_address}</p>`;
  }
  
  footerContent += `</div>`;

  if (brand.email_footer_show_social && (brand.email_footer_social_instagram || brand.email_footer_social_facebook || brand.email_footer_social_linkedin)) {
    footerContent += `<div style="text-align: ${textAlign}; margin-bottom: 15px; font-size: 16px;">`;
    if (brand.email_footer_social_instagram) {
      footerContent += `<a href="${brand.email_footer_social_instagram}" style="color: ${textColor}; margin-right: 12px; text-decoration: none;">📷</a>`;
    }
    if (brand.email_footer_social_facebook) {
      footerContent += `<a href="${brand.email_footer_social_facebook}" style="color: ${textColor}; margin-right: 12px; text-decoration: none;">f</a>`;
    }
    if (brand.email_footer_social_linkedin) {
      footerContent += `<a href="${brand.email_footer_social_linkedin}" style="color: ${textColor}; text-decoration: none;">in</a>`;
    }
    footerContent += `</div>`;
  }

  if (brand.email_footer_custom_text) {
    footerContent += `<p style="margin: 10px 0; text-align: ${textAlign}; font-size: 12px; line-height: 1.5;">${brand.email_footer_custom_text}</p>`;
  }

  if (brand.email_footer_disclaimer) {
    footerContent += `<p style="margin: 10px 0 0 0; text-align: ${textAlign}; font-size: 11px; line-height: 1.4; opacity: 0.8;">${brand.email_footer_disclaimer}</p>`;
  }

  return `<tr><td style="${backgroundStyle} padding: 30px 20px; border-top: 1px solid #e5e7eb; font-size: 13px; color: ${textColor};">${footerContent}</td></tr>`;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { assignment } = await req.json();

    if (!assignment || !assignment.id) {
      return Response.json({ error: 'Missing assignment' }, { status: 400 });
    }

    // Fetch assignment with all details
    const projectCrew = await base44.asServiceRole.entities.ProjectCrew.get(assignment.id);
    if (!projectCrew) {
      return Response.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Fetch branding and email field controls
    const [brandSettings, emailControls] = await Promise.all([
      base44.asServiceRole.entities.BrandSettings.list(),
      base44.asServiceRole.entities.EmailFieldControl.list()
    ]);

    const brand = brandSettings?.[0] || {};
    const visibleFields = emailControls?.reduce((acc, field) => {
      if (field.is_visible) acc[field.field_name] = field.display_label;
      return acc;
    }, {}) || {};

    // Get crew email
    const crewEmail = projectCrew.crew_member_email || projectCrew.crew_email;
    if (!crewEmail) {
      return Response.json({ error: 'No crew email found' }, { status: 400 });
    }

    // Generate secure tokens for both confirm and decline
    const confirmToken = nanoid(32);
    const declineToken = nanoid(32);

    // Create token records
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await Promise.all([
      base44.asServiceRole.entities.CrewAssignmentToken.create({
        crew_assignment_id: projectCrew.id,
        crew_email: crewEmail,
        token: confirmToken,
        action_type: 'confirm',
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      }),
      base44.asServiceRole.entities.CrewAssignmentToken.create({
        crew_assignment_id: projectCrew.id,
        crew_email: crewEmail,
        token: declineToken,
        action_type: 'decline',
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      })
    ]);

    // Build confirmation URLs (adjust domain as needed)
    const baseUrl = Deno.env.get('APP_URL') || 'https://your-app.com';
    const confirmUrl = `${baseUrl}/crew-confirmation?token=${confirmToken}&action=confirm`;
    const declineUrl = `${baseUrl}/crew-confirmation?token=${declineToken}&action=decline`;

    // Build email body with only visible fields
    let bodyContent = '';

    if (visibleFields.project_name) {
      bodyContent += `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${visibleFields.project_name}:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${projectCrew.show_name}</td></tr>`;
    }
    if (visibleFields.crew_name) {
      bodyContent += `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${visibleFields.crew_name}:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${projectCrew.crew_member_name}</td></tr>`;
    }
    if (visibleFields.role) {
      bodyContent += `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${visibleFields.role}:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${projectCrew.role}</td></tr>`;
    }
    if (visibleFields.date) {
      bodyContent += `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${visibleFields.date}:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${projectCrew.assignment_date}</td></tr>`;
    }
    if (visibleFields.start_time && projectCrew.start_time) {
      bodyContent += `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${visibleFields.start_time}:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${projectCrew.start_time}</td></tr>`;
    }
    if (visibleFields.end_time && projectCrew.end_time) {
      bodyContent += `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${visibleFields.end_time}:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${projectCrew.end_time}</td></tr>`;
    }
    if (visibleFields.location && projectCrew.location) {
      bodyContent += `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${visibleFields.location}:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${projectCrew.location}</td></tr>`;
    }
    if (visibleFields.notes && projectCrew.notes) {
      bodyContent += `<tr><td colspan="2" style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${visibleFields.notes}:</strong><br>${projectCrew.notes}</td></tr>`;
    }

    // Build complete HTML email
    const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; overflow: hidden;">
          
          <!-- HEADER -->
          ${renderHeaderHtml(brand)}

          <!-- BODY -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #1f2937;">Crew Assignment Confirmation</h2>
              <p style="margin: 0 0 20px 0; color: #6b7280; line-height: 1.6;">
                You have been assigned to the following project. Please confirm or decline your availability.
              </p>

              <!-- ASSIGNMENT DETAILS -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border: 1px solid #e5e7eb; border-radius: 6px;">
                ${bodyContent}
              </table>

              <!-- ACTION BUTTONS -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${confirmUrl}" style="display: inline-block; padding: 12px 30px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 15px;">
                      ✓ Confirm
                    </a>
                    <a href="${declineUrl}" style="display: inline-block; padding: 12px 30px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      ✗ Decline
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                Links expire in 30 days. If you have questions, contact ${brand.company_email || 'support'}.
              </p>
            </td>
          </tr>

          <!-- FOOTER - Company Info -->
          ${renderFooterHtml(brand)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // Send email
    await base44.integrations.Core.SendEmail({
      to: crewEmail,
      subject: `Crew Assignment Confirmation – ${projectCrew.show_name}`,
      body: htmlEmail
    });

    return Response.json({
      success: true,
      message: 'Confirmation email sent',
      tokens: { confirmToken, declineToken }
    });
  } catch (error) {
    console.error('Email generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});