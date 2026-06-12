import React from 'react';

const COLOR = '#1FB8A0';

// Just the [ ] icon — for collapsed sidebar, favicon, small spaces
export function Port24Icon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left bracket [ */}
      <rect x="4"  y="4"  width="14" height="6"  fill={COLOR}/>
      <rect x="4"  y="4"  width="6"  height="48" fill={COLOR}/>
      <rect x="4"  y="46" width="14" height="6"  fill={COLOR}/>
      {/* Right bracket ] */}
      <rect x="38" y="4"  width="14" height="6"  fill={COLOR}/>
      <rect x="46" y="4"  width="6"  height="48" fill={COLOR}/>
      <rect x="38" y="46" width="14" height="6"  fill={COLOR}/>
    </svg>
  );
}

// Full logo: [ ] PORT 24
export function Port24Logo({ iconSize = 32, textSize = '1rem' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Port24Icon size={iconSize} />
      <span style={{
        fontFamily: "'Arial Black', Arial, sans-serif",
        fontWeight: 900,
        fontSize: textSize,
        letterSpacing: '0.08em',
        color: COLOR,
        whiteSpace: 'nowrap',
      }}>
        PORT 24
      </span>
    </div>
  );
}

export default Port24Logo;
