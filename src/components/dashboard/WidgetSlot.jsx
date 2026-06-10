import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WIDGET_REGISTRY } from '@/lib/dashboardWidgetRegistry';

// Import all widget components
import StatCard from './widgets/StatCard';
import UpcomingShowsWidget from './widgets/UpcomingShowsWidget';
import RecentActivityWidget from './widgets/RecentActivityWidget';
import ActiveAlertsWidget from './widgets/ActiveAlertsWidget';
import InventoryUtilizationWidget from './widgets/InventoryUtilizationWidget';
import ProjectsAttentionWidget from './widgets/ProjectsAttentionWidget';
import GearDueBackWidget from './widgets/GearDueBackWidget';
import OpenQuotesWidget from './widgets/OpenQuotesWidget';
import OverdueInvoicesWidget from './widgets/OverdueInvoicesWidget';
import BillingSummaryWidget from './widgets/BillingSummaryWidget';
import CrewAssignmentsWidget from './widgets/CrewAssignmentsWidget';
import TruckPacksWidget from './widgets/TruckPacksWidget';
import LowStockWidget from './widgets/LowStockWidget';
import InventoryWarningsWidget from './widgets/InventoryWarningsWidget';
import AVHospitalWidget from './widgets/AVHospitalWidget';

const WIDGET_COMPONENTS = {
  total_assets: () => <StatCard type="total_assets" />,
  available_assets: () => <StatCard type="available_assets" />,
  checked_out: () => <StatCard type="checked_out" />,
  in_hospital: () => <StatCard type="in_hospital" />,
  upcoming_shows: () => <UpcomingShowsWidget />,
  recent_activity: () => <RecentActivityWidget />,
  active_alerts: () => <ActiveAlertsWidget />,
  inventory_utilization: () => <InventoryUtilizationWidget />,
  projects_attention: () => <ProjectsAttentionWidget />,
  gear_due_back: () => <GearDueBackWidget />,
  open_quotes: () => <OpenQuotesWidget />,
  overdue_invoices: () => <OverdueInvoicesWidget />,
  billing_summary: () => <BillingSummaryWidget />,
  crew_assignments: () => <CrewAssignmentsWidget />,
  truck_packs: () => <TruckPacksWidget />,
  low_stock: () => <LowStockWidget />,
  inventory_warnings: () => <InventoryWarningsWidget />,
  av_hospital: () => <AVHospitalWidget />
};

export default function WidgetSlot({ widgetId, editMode, onRemove }) {
  const widget = WIDGET_REGISTRY[widgetId];
  const Component = WIDGET_COMPONENTS[widgetId];

  if (!widget || !Component) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <p>Widget not found</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm">{widget.name}</h3>
        {editMode && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <Component />
      </div>
    </div>
  );
}