import React from 'react';
import { Card } from '@/components/ui/card';
import EmailFooter from './EmailFooter';

const COLORS = {
  primary: '#2563eb',
  green: '#10b981',
  gray: '#6b7280'
};

export default function EmailPreview({ sections, headerEnabled, footerEnabled, branding, subjectLine }) {
  const renderSection = (section) => {
    const baseStyle = {
      textAlign: section.alignment || 'left',
      margin: '0 0 16px 0'
    };

    switch (section.type) {
      case 'heading':
        return (
          <h2 key={section.id} style={{ ...baseStyle, fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
            {section.content}
          </h2>
        );
      case 'paragraph':
        return (
          <p key={section.id} style={{ ...baseStyle, fontSize: '14px', lineHeight: '1.6', color: '#374151' }}>
            {section.content}
          </p>
        );
      case 'button':
        return (
          <div key={section.id} style={{ ...baseStyle, marginBottom: '16px' }}>
            <a href="#" style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: COLORS[section.styling?.color || 'primary'],
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {section.content}
            </a>
          </div>
        );
      case 'divider':
        return <hr key={section.id} style={{ borderTop: '1px solid #e5e7eb', margin: '16px 0' }} />;
      case 'spacer':
        return <div key={section.id} style={{ height: `${section.styling?.height || 20}px` }} />;
      case 'image':
        return (
          <div key={section.id} style={{ ...baseStyle, marginBottom: '16px' }}>
            <img src={section.content} alt="Email content" style={{ maxWidth: `${section.styling?.maxWidth || 400}px`, width: '100%', height: 'auto', borderRadius: '6px' }} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-muted-foreground">Preview</div>
      <Card className="p-0 overflow-hidden">
        {/* Email Container */}
        <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', backgroundColor: '#f9fafb' }}>
          
          {/* Header */}
          {headerEnabled && (
            <div style={{ backgroundColor: branding?.primary_color || '#2563eb', color: 'white', padding: '24px', textAlign: 'center' }}>
              {branding?.logo_url && (
                <img src={branding.logo_url} alt="Logo" style={{ maxHeight: '50px', marginBottom: '12px' }} />
              )}
              <h1 style={{ margin: '0', fontSize: '28px', fontWeight: 'bold' }}>
                {branding?.company_name || 'Company'}
              </h1>
            </div>
          )}

          {/* Subject Line (for reference) */}
          <div style={{ padding: '16px 24px', backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
            <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Subject:</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#1f2937' }}>{subjectLine}</p>
          </div>

          {/* Body */}
          <div style={{ padding: '24px', backgroundColor: 'white', minHeight: '200px' }}>
            {sections.map(renderSection)}
          </div>

          {/* Footer */}
          {footerEnabled && <EmailFooter branding={branding} />}
        </div>
      </Card>
    </div>
  );
}