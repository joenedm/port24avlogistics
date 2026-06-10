import React from 'react';
import { AlertTriangle, FileCheck, MessageSquare, Layout, Truck } from 'lucide-react';

export default function ClientAlertsBar({ client }) {
  if (!client) return null;

  const alerts = [];

  if (client.po_required) {
    alerts.push({
      icon: FileCheck,
      label: 'PO Required',
      detail: client.po_notes || 'This client requires a PO number on all invoices.',
      color: 'text-orange-600',
      bg: 'bg-orange-500/10 border-orange-500/20',
    });
  }

  if (client.coi_required) {
    alerts.push({
      icon: FileCheck,
      label: 'COI Required',
      detail: client.coi_holder_name ? `Holder: ${client.coi_holder_name}${client.coi_minimum_coverage ? ` · ${client.coi_minimum_coverage}` : ''}` : (client.coi_notes || 'Certificate of Insurance required.'),
      color: 'text-purple-600',
      bg: 'bg-purple-500/10 border-purple-500/20',
    });
  }

  if (client.preferred_communication && client.preferred_communication !== 'email') {
    alerts.push({
      icon: MessageSquare,
      label: `Prefers ${client.preferred_communication}`,
      detail: client.communication_notes || `Contact via ${client.preferred_communication}`,
      color: 'text-blue-600',
      bg: 'bg-blue-500/10 border-blue-500/20',
    });
  }

  if (client.quote_format && client.quote_format !== 'detailed') {
    alerts.push({
      icon: Layout,
      label: `Quote: ${client.quote_format.replace(/_/g, ' ')}`,
      detail: 'Non-standard quote format preference on file.',
      color: 'text-teal-600',
      bg: 'bg-teal-500/10 border-teal-500/20',
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {alerts.map((a, i) => (
        <div key={i} className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border ${a.bg} ${a.color} font-medium max-w-xs`} title={a.detail}>
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>{a.label}</span>
        </div>
      ))}
    </div>
  );
}