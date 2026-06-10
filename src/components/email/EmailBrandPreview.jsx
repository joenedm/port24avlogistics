import React from 'react';
import { Card } from '@/components/ui/card';
import EmailFooter from './EmailFooter';

export default function EmailBrandPreview({ type, branding, visibleFields = [] }) {
  const isFieldVisible = (fieldName) => {
    if (visibleFields.length === 0) return true;
    return visibleFields.includes(fieldName);
  };
  const getHeaderBackgroundStyle = () => {
    const backgroundType = branding?.email_header_background_type || 'solid';
    switch (backgroundType) {
      case 'image':
        return {
          backgroundImage: `url(${branding?.email_header_background_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        };
      case 'gradient':
        return { background: branding?.email_header_background_gradient };
      default:
        return { backgroundColor: branding?.email_header_background_color || '#2563eb' };
    }
  };

  const renderHeader = () => {
    const logoPosition = branding?.email_header_logo_position || 'top';
    const isInline = logoPosition.startsWith('inline');
    
    const renderLogo = () => branding?.email_header_show_logo !== false && branding?.email_header_logo_url && (
      <img src={branding.email_header_logo_url} alt="Logo" style={{ maxHeight: '50px', ...(isInline ? { marginRight: '15px' } : { marginBottom: '15px' }) }} />
    );

    const renderSocial = () => branding?.email_header_show_social && (branding?.email_header_social_instagram || branding?.email_header_social_facebook || branding?.email_header_social_linkedin) && (
      <div style={{ fontSize: '16px' }}>
        {branding?.email_header_social_instagram && (
          <a href={branding.email_header_social_instagram} style={{ color: branding?.email_header_text_color || 'white', marginRight: '12px', textDecoration: 'none' }}>
            📷
          </a>
        )}
        {branding?.email_header_social_facebook && (
          <a href={branding.email_header_social_facebook} style={{ color: branding?.email_header_text_color || 'white', marginRight: '12px', textDecoration: 'none' }}>
            f
          </a>
        )}
        {branding?.email_header_social_linkedin && (
          <a href={branding.email_header_social_linkedin} style={{ color: branding?.email_header_text_color || 'white', textDecoration: 'none' }}>
            in
          </a>
        )}
      </div>
    );

    const getAlignment = () => {
      if (isInline) {
        if (logoPosition === 'inline_left') return 'flex-start';
        if (logoPosition === 'inline_center') return 'center';
        if (logoPosition === 'inline_right') return 'flex-end';
      }
      return branding?.email_header_alignment || 'center';
    };

    return (
      <div style={{
        ...getHeaderBackgroundStyle(),
        padding: '30px',
        color: branding?.email_header_text_color || 'white'
      }}>
        {logoPosition === 'top' && (
          <>
            {renderLogo()}
            {renderSocial()}
          </>
        )}
        
        {isInline && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: getAlignment(), gap: '15px' }}>
            {logoPosition === 'inline_left' && renderLogo()}
            {logoPosition === 'inline_center' && renderLogo()}
            <div style={{ textAlign: logoPosition === 'inline_left' ? 'left' : logoPosition === 'inline_right' ? 'right' : 'center' }}>
              {renderSocial()}
            </div>
            {logoPosition === 'inline_right' && renderLogo()}
          </div>
        )}
      </div>
    );
  };

  const renderFooter = () => (
    <div style={{
      backgroundColor: '#f9fafb',
      padding: '20px',
      borderTop: '1px solid #e5e7eb',
      fontSize: '12px',
      color: '#6b7280',
      textAlign: 'center'
    }}>
      {branding?.email_footer_text && (
        <p style={{ margin: '0 0 10px 0' }}>{branding.email_footer_text}</p>
      )}
      {branding?.email_footer_show_contact && (
        <p style={{ margin: '0 0 5px 0' }}>
          {branding?.company_email && <span>{branding.company_email}</span>}
          {branding?.company_email && branding?.company_phone && <span> • </span>}
          {branding?.company_phone && <span>{branding.company_phone}</span>}
        </p>
      )}
      {branding?.email_footer_show_address && branding?.company_address && (
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{branding.company_address}</p>
      )}
      {branding?.email_footer_disclaimer && (
        <p style={{ margin: '10px 0 0 0', fontSize: '11px', lineHeight: '1.4' }}>
          {branding.email_footer_disclaimer}
        </p>
      )}
    </div>
  );

  const renderFullEmail = () => (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      {renderHeader()}
      <div style={{ padding: '30px', backgroundColor: 'white' }}>
        <h2 style={{ margin: '0 0 15px 0', fontSize: '20px', color: '#1f2937' }}>
          Crew Assignment Confirmation
        </h2>
        <p style={{ margin: '0 0 20px 0', color: '#6b7280', lineHeight: '1.6' }}>
          You have been assigned to a project. Please confirm or decline your availability.
        </p>
        <div style={{
          margin: '20px 0',
          padding: '15px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          {isFieldVisible('project_name') && (
            <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '12px' }}>
              <strong>Project:</strong> Sample Project Name
            </p>
          )}
          {isFieldVisible('crew_name') && (
            <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '12px' }}>
              <strong>Crew Member:</strong> John Doe
            </p>
          )}
          {isFieldVisible('role') && (
            <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '12px' }}>
              <strong>Role:</strong> Audio Technician
            </p>
          )}
          {isFieldVisible('date') && (
            <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '12px' }}>
              <strong>Date:</strong> April 15, 2026
            </p>
          )}
          {isFieldVisible('start_time') && (
            <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '12px' }}>
              <strong>Start Time:</strong> 9:00 AM
            </p>
          )}
          {isFieldVisible('end_time') && (
            <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '12px' }}>
              <strong>End Time:</strong> 6:00 PM
            </p>
          )}
          {isFieldVisible('location') && (
            <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '12px' }}>
              <strong>Location:</strong> Convention Center
            </p>
          )}
          {isFieldVisible('cost') && (
            <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '12px' }}>
              <strong>Cost:</strong> $1,200
            </p>
          )}
          {isFieldVisible('labor_cost') && (
            <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '12px' }}>
              <strong>Labor Cost:</strong> $900
            </p>
          )}
          {isFieldVisible('equipment_cost') && (
            <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '12px' }}>
              <strong>Equipment Cost:</strong> $300
            </p>
          )}
          {isFieldVisible('total_cost') && (
            <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '12px' }}>
              <strong>Total Cost:</strong> $1,200
            </p>
          )}
          {isFieldVisible('notes') && (
            <p style={{ margin: '0', color: '#6b7280', fontSize: '12px' }}>
              <strong>Notes:</strong> Please arrive 15 minutes early
            </p>
          )}
        </div>
        <div style={{ textAlign: 'center', margin: '30px 0' }}>
          <a href="#" style={{
            display: 'inline-block',
            padding: '12px 30px',
            backgroundColor: '#10b981',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            marginRight: '15px'
          }}>
            ✓ Confirm
          </a>
          <a href="#" style={{
            display: 'inline-block',
            padding: '12px 30px',
            backgroundColor: '#ef4444',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold'
          }}>
            ✗ Decline
          </a>
        </div>
      </div>
      <EmailFooter branding={branding} />
    </div>
  );

  const content = type === 'header' ? renderHeader() : type === 'footer' ? renderFooter() : renderFullEmail();

  return (
    <Card className="p-0 overflow-hidden">
      <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb', padding: '20px' }}>
        {content}
      </div>
    </Card>
  );
}