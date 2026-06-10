import { useState } from 'react';

export default function SerialNumbersDisplay({ serialNumbers }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!serialNumbers) return '—';
  
  const serials = serialNumbers
    .split(',')
    .map(s => s.trim())
    .filter(s => s);
  
  if (serials.length <= 3) {
    return <span className="font-mono text-xs">{serials.join(', ')}</span>;
  }
  
  return (
    <div className="space-y-1">
      <span className="font-mono text-xs">
        {expanded 
          ? serials.join(', ')
          : `${serials.slice(0, 3).join(', ')} `}
      </span>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-primary hover:underline ml-1"
      >
        {expanded ? '—' : `... +${serials.length - 3}`}
      </button>
    </div>
  );
}