import React from 'react';
import { Mail, Phone, Globe, Instagram, Facebook, Linkedin, MapPin } from 'lucide-react';

export default function EmailFooter({ branding = {} }) {
  if (!branding) return null;

  const getBackgroundStyle = () => {
    switch (branding.email_footer_background_type) {
      case 'image':
        return {
          backgroundImage: `url(${branding.email_footer_background_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        };
      case 'gradient':
        return { background: branding.email_footer_background_gradient };
      default:
        return { backgroundColor: branding.email_footer_background_color || '#f9fafb' };
    }
  };

  const textColor = branding.email_footer_text_color || '#6b7280';
  const alignment = branding.email_footer_alignment || 'center';
  const textAlign = alignment === 'center' ? 'center' : 'left';

  return (
    <div style={{
      ...getBackgroundStyle(),
      padding: '30px 20px',
      borderTop: '1px solid #e5e7eb',
      fontSize: '13px',
      color: textColor
    }}>
      {/* Logo */}
      {branding.email_footer_show_logo && branding.email_footer_logo_url && (
        <div style={{ textAlign, marginBottom: '15px' }}>
          <img src={branding.email_footer_logo_url} alt="Logo" style={{ maxHeight: '35px' }} />
        </div>
      )}

      {/* Company Name */}
      {branding.email_footer_show_company_name && branding.company_name && (
        <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', textAlign }}>
          {branding.company_name}
        </p>
      )}

      {/* Contact Info */}
      <div style={{ textAlign, marginBottom: '15px', lineHeight: '1.6' }}>
        {branding.email_footer_show_phone && branding.company_phone && (
          <p style={{ margin: '0 0 5px 0' }}>
            <a href={`tel:${branding.company_phone}`} style={{ color: textColor, textDecoration: 'none' }}>
              📱 {branding.company_phone}
            </a>
          </p>
        )}
        {branding.email_footer_show_email && branding.company_email && (
          <p style={{ margin: '0 0 5px 0' }}>
            <a href={`mailto:${branding.company_email}`} style={{ color: textColor, textDecoration: 'none' }}>
              ✉ {branding.company_email}
            </a>
          </p>
        )}
        {branding.email_footer_show_website && branding.company_website && (
          <p style={{ margin: '0 0 5px 0' }}>
            <a href={branding.company_website} style={{ color: textColor, textDecoration: 'none' }}>
              🌐 {branding.company_website.replace(/^https?:\/\//, '')}
            </a>
          </p>
        )}
        {branding.email_footer_show_address && branding.company_address && (
          <p style={{ margin: '0', whiteSpace: 'pre-wrap' }}>
            📍 {branding.company_address}
          </p>
        )}
      </div>

      {/* Social Links */}
      {branding.email_footer_show_social && (branding.email_footer_social_instagram || branding.email_footer_social_facebook || branding.email_footer_social_linkedin) && (
        <div style={{ textAlign, marginBottom: '15px', fontSize: '16px' }}>
          {branding.email_footer_social_instagram && (
            <a href={branding.email_footer_social_instagram} style={{ color: textColor, marginRight: '12px', textDecoration: 'none' }}>
              📷
            </a>
          )}
          {branding.email_footer_social_facebook && (
            <a href={branding.email_footer_social_facebook} style={{ color: textColor, marginRight: '12px', textDecoration: 'none' }}>
              f
            </a>
          )}
          {branding.email_footer_social_linkedin && (
            <a href={branding.email_footer_social_linkedin} style={{ color: textColor, textDecoration: 'none' }}>
              in
            </a>
          )}
        </div>
      )}

      {/* Custom Text */}
      {branding.email_footer_custom_text && (
        <p style={{ margin: '10px 0', textAlign, fontSize: '12px', lineHeight: '1.5' }}>
          {branding.email_footer_custom_text}
        </p>
      )}

      {/* Disclaimer */}
      {branding.email_footer_disclaimer && (
        <p style={{ margin: '10px 0 0 0', textAlign, fontSize: '11px', lineHeight: '1.4', opacity: 0.8 }}>
          {branding.email_footer_disclaimer}
        </p>
      )}
    </div>
  );
}