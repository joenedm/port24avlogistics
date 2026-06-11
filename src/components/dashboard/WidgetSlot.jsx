import React from 'react';
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

export default function WidgetSlot({ widgetId }) {
  const Component = WIDGET_COMPONENTS[widgetId];
  if (!Component) return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Widget not found</div>
  );
  return <Component />;
}