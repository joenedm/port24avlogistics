// Complete widget registry with all 18+ dashboard widgets
export const WIDGET_REGISTRY = {
  // Operations
  total_assets: {
    id: 'total_assets',
    name: 'Total Assets',
    category: 'Operations',
    description: 'Total inventory count',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    roles: ['admin', 'manager', 'crew']
  },
  available_assets: {
    id: 'available_assets',
    name: 'Available Assets',
    category: 'Operations',
    description: 'Items ready to use',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    roles: ['admin', 'manager', 'crew']
  },
  checked_out: {
    id: 'checked_out',
    name: 'Checked Out',
    category: 'Operations',
    description: 'Items in use',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    roles: ['admin', 'manager', 'crew']
  },
  in_hospital: {
    id: 'in_hospital',
    name: 'In Hospital',
    category: 'Operations',
    description: 'Items needing repair',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    roles: ['admin', 'manager']
  },

  // Inventory
  low_stock: {
    id: 'low_stock',
    name: 'Low Stock Consumables',
    category: 'Inventory',
    description: 'Items below reorder level',
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 3 },
    roles: ['admin', 'manager']
  },
  inventory_warnings: {
    id: 'inventory_warnings',
    name: 'Inventory Warnings',
    category: 'Inventory',
    description: 'Items needing attention',
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 3 },
    roles: ['admin', 'manager']
  },
  inventory_utilization: {
    id: 'inventory_utilization',
    name: 'Inventory Utilization',
    category: 'Inventory',
    description: 'Equipment usage by category',
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 3 },
    roles: ['admin', 'manager']
  },

  // Projects
  upcoming_shows: {
    id: 'upcoming_shows',
    name: 'Upcoming Shows',
    category: 'Projects',
    description: 'Scheduled projects',
    defaultSize: { w: 12, h: 3 },
    minSize: { w: 6, h: 3 },
    roles: ['admin', 'manager', 'crew']
  },
  projects_attention: {
    id: 'projects_attention',
    name: 'Projects Needing Attention',
    category: 'Projects',
    description: 'Projects with issues',
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 3 },
    roles: ['admin', 'manager']
  },
  gear_due_back: {
    id: 'gear_due_back',
    name: 'Gear Due Back',
    category: 'Projects',
    description: 'Items needing return',
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 3 },
    roles: ['admin', 'manager']
  },

  // Quotes & Invoices
  open_quotes: {
    id: 'open_quotes',
    name: 'Open Quotes',
    category: 'Quotes & Invoices',
    description: 'Pending quote approvals',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 3 },
    roles: ['admin', 'finance']
  },
  overdue_invoices: {
    id: 'overdue_invoices',
    name: 'Overdue Invoices',
    category: 'Quotes & Invoices',
    description: 'Invoices past due',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 3 },
    roles: ['admin', 'finance']
  },
  billing_summary: {
    id: 'billing_summary',
    name: 'Billing Summary',
    category: 'Quotes & Invoices',
    description: 'Financial overview',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 3 },
    roles: ['admin', 'finance']
  },

  // Crew
  crew_assignments: {
    id: 'crew_assignments',
    name: 'Crew Assignments',
    category: 'Crew',
    description: 'Active crew bookings',
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 3 },
    roles: ['admin', 'manager']
  },

  // Trucks
  truck_packs: {
    id: 'truck_packs',
    name: 'Truck Packs',
    category: 'Operations',
    description: 'Active truck packs',
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 3 },
    roles: ['admin', 'manager']
  },

  // Alerts & Health
  active_alerts: {
    id: 'active_alerts',
    name: 'Active Alerts',
    category: 'Alerts',
    description: 'System alerts & warnings',
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 3 },
    roles: ['admin', 'manager']
  },
  av_hospital: {
    id: 'av_hospital',
    name: 'AV Hospital Items',
    category: 'Alerts',
    description: 'Items in repair',
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 3 },
    roles: ['admin', 'manager']
  },

  // Activity
  recent_activity: {
    id: 'recent_activity',
    name: 'Recent Activity',
    category: 'Operations',
    description: 'Latest movements & changes',
    defaultSize: { w: 12, h: 3 },
    minSize: { w: 6, h: 3 },
    roles: ['admin', 'manager', 'crew']
  }
};

export const WIDGET_CATEGORIES = [
  'Operations',
  'Inventory',
  'Projects',
  'Quotes & Invoices',
  'Crew',
  'Alerts'
];

export const DEFAULT_LAYOUTS = {
  admin: [
    { x: 0, y: 0, w: 3, h: 2, i: 'total_assets' },
    { x: 3, y: 0, w: 3, h: 2, i: 'available_assets' },
    { x: 6, y: 0, w: 3, h: 2, i: 'checked_out' },
    { x: 9, y: 0, w: 3, h: 2, i: 'in_hospital' },
    { x: 0, y: 2, w: 12, h: 3, i: 'upcoming_shows' },
    { x: 0, y: 5, w: 6, h: 3, i: 'open_quotes' },
    { x: 6, y: 5, w: 6, h: 3, i: 'overdue_invoices' },
    { x: 0, y: 8, w: 12, h: 3, i: 'recent_activity' },
    { x: 0, y: 11, w: 6, h: 3, i: 'active_alerts' },
    { x: 6, y: 11, w: 6, h: 3, i: 'inventory_warnings' }
  ],
  manager: [
    { x: 0, y: 0, w: 3, h: 2, i: 'total_assets' },
    { x: 3, y: 0, w: 3, h: 2, i: 'available_assets' },
    { x: 6, y: 0, w: 3, h: 2, i: 'checked_out' },
    { x: 9, y: 0, w: 3, h: 2, i: 'in_hospital' },
    { x: 0, y: 2, w: 12, h: 3, i: 'upcoming_shows' },
    { x: 0, y: 5, w: 6, h: 3, i: 'projects_attention' },
    { x: 6, y: 5, w: 6, h: 3, i: 'gear_due_back' },
    { x: 0, y: 8, w: 12, h: 3, i: 'recent_activity' }
  ],
  finance: [
    { x: 0, y: 0, w: 4, h: 2, i: 'open_quotes' },
    { x: 4, y: 0, w: 4, h: 2, i: 'overdue_invoices' },
    { x: 8, y: 0, w: 4, h: 2, i: 'billing_summary' },
    { x: 0, y: 2, w: 12, h: 3, i: 'upcoming_shows' }
  ],
  crew: [
    { x: 0, y: 0, w: 6, h: 3, i: 'crew_assignments' },
    { x: 6, y: 0, w: 6, h: 3, i: 'upcoming_shows' },
    { x: 0, y: 3, w: 12, h: 3, i: 'recent_activity' }
  ]
};

export const getWidgetsForRole = (role) => {
  return Object.values(WIDGET_REGISTRY).filter(w => w.roles.includes(role));
};

export const getWidgetsByCategory = (role) => {
  const widgets = getWidgetsForRole(role);
  const grouped = {};
  WIDGET_CATEGORIES.forEach(cat => {
    grouped[cat] = widgets.filter(w => w.category === cat);
  });
  return grouped;
};