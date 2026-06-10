/**
 * projectStatusEngine.js
 * Single source of truth for project status labels, colors, and rules.
 *
 * Backend keys are STABLE and must never change — they are stored in the DB.
 * Admin can customize labels, colors, visibility, etc. via StatusFlowSettings
 * which stores its config in BrandSettings under key "fulfillment_status_flow".
 *
 * Legacy key mapping (old DB values → canonical keys):
 *   planned      → planning
 *   load_out     → on_truck
 *   on_site      → on_location
 *   strike       → needs_return
 *   returned     → returning (partial) or finished (all returned)
 *   completed    → finished
 */

// ─── Canonical status keys (ordered) ────────────────────────────────────────
export const STATUS_KEYS = [
  'planning',
  'confirmed',
  'picking',
  'picked',
  'on_truck',
  'on_location',
  'needs_return',
  'returning',
  'finished',
];

// ─── Legacy key → canonical key mapping ─────────────────────────────────────
export const LEGACY_KEY_MAP = {
  planned:    'planning',
  load_out:   'on_truck',
  on_site:    'on_location',
  strike:     'needs_return',
  returned:   'returning',
  completed:  'finished',
};

export function normalizeStatusKey(key) {
  if (!key) return 'planning';
  return LEGACY_KEY_MAP[key] || key;
}

// ─── Default flow config ─────────────────────────────────────────────────────
// This is what the admin sees and can customize.
export const DEFAULT_STATUS_FLOW = [
  {
    key: 'planning',
    label: 'Planning',
    client_label: 'Planning',
    color: '#6b7280',
    description: 'Project created. Quote in progress.',
    enabled: true,
    show_internally: true,
    show_to_clients: true,
    show_on_dashboard: true,
    show_in_list: true,
    show_in_scan: false,
    show_in_reports: true,
    can_move_forward_min_role: 'coordinator',
    can_move_backward_min_role: 'manager',
    can_override_min_role: 'admin',
    auto_advance: false,
    require_reason_for_override: false,
    log_override: true,
  },
  {
    key: 'confirmed',
    label: 'Confirmed',
    client_label: 'Confirmed',
    color: '#10b981',
    description: 'Quote confirmed. Scan/pick workflow unlocked.',
    enabled: true,
    show_internally: true,
    show_to_clients: true,
    show_on_dashboard: true,
    show_in_list: true,
    show_in_scan: true,
    show_in_reports: true,
    can_move_forward_min_role: 'coordinator',
    can_move_backward_min_role: 'manager',
    can_override_min_role: 'admin',
    auto_advance: true,
    require_quote_confirmed: true,
    require_reason_for_override: false,
    log_override: true,
  },
  {
    key: 'picking',
    label: 'Picking',
    client_label: 'In Preparation',
    color: '#f59e0b',
    description: 'At least one item has been picked.',
    enabled: true,
    show_internally: true,
    show_to_clients: false,
    show_on_dashboard: true,
    show_in_list: true,
    show_in_scan: true,
    show_in_reports: true,
    can_move_forward_min_role: 'coordinator',
    can_move_backward_min_role: 'manager',
    can_override_min_role: 'admin',
    auto_advance: true,
    require_reason_for_override: false,
    log_override: true,
  },
  {
    key: 'picked',
    label: 'Picked',
    client_label: 'Ready',
    color: '#3b82f6',
    description: 'All assigned items have been picked.',
    enabled: true,
    show_internally: true,
    show_to_clients: false,
    show_on_dashboard: true,
    show_in_list: true,
    show_in_scan: true,
    show_in_reports: true,
    can_move_forward_min_role: 'coordinator',
    can_move_backward_min_role: 'manager',
    can_override_min_role: 'admin',
    auto_advance: true,
    require_reason_for_override: false,
    log_override: true,
  },
  {
    key: 'on_truck',
    label: 'On Truck',
    client_label: 'En Route',
    color: '#8b5cf6',
    description: 'Gear has been loaded and is in transit.',
    enabled: true,
    show_internally: true,
    show_to_clients: true,
    show_on_dashboard: true,
    show_in_list: true,
    show_in_scan: true,
    show_in_reports: true,
    can_move_forward_min_role: 'coordinator',
    can_move_backward_min_role: 'manager',
    can_override_min_role: 'admin',
    auto_advance: true,
    require_reason_for_override: false,
    log_override: true,
  },
  {
    key: 'on_location',
    label: 'On Location',
    client_label: 'Gear Delivered',
    color: '#1FB8A0',
    description: 'All gear scanned out / confirmed on location.',
    enabled: true,
    show_internally: true,
    show_to_clients: true,
    show_on_dashboard: true,
    show_in_list: true,
    show_in_scan: true,
    show_in_reports: true,
    can_move_forward_min_role: 'manager',
    can_move_backward_min_role: 'manager',
    can_override_min_role: 'admin',
    auto_advance: true,
    require_reason_for_override: true,
    log_override: true,
  },
  {
    key: 'needs_return',
    label: 'Needs Return',
    client_label: 'Wrap Up',
    color: '#ef4444',
    description: 'Return date passed. Gear still out.',
    enabled: true,
    show_internally: true,
    show_to_clients: false,
    show_on_dashboard: true,
    show_in_list: true,
    show_in_scan: true,
    show_in_reports: true,
    can_move_forward_min_role: 'coordinator',
    can_move_backward_min_role: 'manager',
    can_override_min_role: 'admin',
    auto_advance: true,
    require_reason_for_override: true,
    log_override: true,
  },
  {
    key: 'returning',
    label: 'Returning',
    client_label: 'Returning',
    color: '#f97316',
    description: 'Some gear has been scanned back in.',
    enabled: true,
    show_internally: true,
    show_to_clients: false,
    show_on_dashboard: true,
    show_in_list: true,
    show_in_scan: true,
    show_in_reports: true,
    can_move_forward_min_role: 'coordinator',
    can_move_backward_min_role: 'manager',
    can_override_min_role: 'admin',
    auto_advance: true,
    require_reason_for_override: false,
    log_override: true,
  },
  {
    key: 'finished',
    label: 'Finished',
    client_label: 'Complete',
    color: '#6b7280',
    description: 'All gear returned. Project closed.',
    enabled: true,
    show_internally: true,
    show_to_clients: true,
    show_on_dashboard: false,
    show_in_list: true,
    show_in_scan: false,
    show_in_reports: true,
    can_move_forward_min_role: 'manager',
    can_move_backward_min_role: 'manager',
    can_override_min_role: 'admin',
    auto_advance: true,
    require_reason_for_override: true,
    log_override: true,
  },
];

// ─── Parse the stored flow from BrandSettings ─────────────────────────────
export function parseStatusFlow(brandSettings) {
  const SETTING_KEY = 'fulfillment_status_flow';
  const record = (brandSettings || []).find(b => b.setting_key === SETTING_KEY);
  if (!record?.setting_value) return DEFAULT_STATUS_FLOW;
  try {
    const parsed = JSON.parse(record.setting_value);
    // Merge saved config onto defaults (ensures new fields are always present)
    return DEFAULT_STATUS_FLOW.map(def => {
      const saved = parsed.find(s => s.key === def.key);
      return saved ? { ...def, ...saved } : def;
    });
  } catch {
    return DEFAULT_STATUS_FLOW;
  }
}

// ─── Lookup helpers ──────────────────────────────────────────────────────────

export function getStatusConfig(key, flow) {
  const canonical = normalizeStatusKey(key);
  const f = flow || DEFAULT_STATUS_FLOW;
  return f.find(s => s.key === canonical) || DEFAULT_STATUS_FLOW.find(s => s.key === canonical) || { key: canonical, label: canonical, color: '#6b7280' };
}

export function getStatusLabel(key, flow, { forClient = false } = {}) {
  const cfg = getStatusConfig(key, flow);
  return forClient ? (cfg.client_label || cfg.label) : cfg.label;
}

export function getStatusColor(key, flow) {
  return getStatusConfig(key, flow).color || '#6b7280';
}

export function getStatusStyle(key, flow) {
  const color = getStatusColor(key, flow);
  return {
    backgroundColor: color + '22',
    color: color,
    borderColor: color + '55',
  };
}

// ─── Tailwind-safe color map for badge classes ────────────────────────────
// We derive a className string from the hex color by mapping known defaults.
// Custom admin colors fall back to inline styles (use getStatusStyle).
const COLOR_CLASS_MAP = {
  '#6b7280': 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  '#10b981': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  '#f59e0b': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  '#3b82f6': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  '#8b5cf6': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  '#1FB8A0': 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  '#ef4444': 'bg-red-500/10 text-red-600 border-red-500/20',
  '#f97316': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
};

export function getStatusClassName(key, flow) {
  const color = getStatusColor(key, flow);
  return COLOR_CLASS_MAP[color] || null; // null = use inline style
}

// ─── Statuses that unlock scan/pick ─────────────────────────────────────────
export const SCAN_UNLOCKED_KEYS = new Set(['confirmed','picking','picked','on_truck','on_location','needs_return','returning']);

// ─── Statuses considered "active" (for dashboard counts) ─────────────────────
export const ACTIVE_STATUS_KEYS = ['confirmed','picking','picked','on_truck','on_location','needs_return','returning'];

// ─── Statuses considered "upcoming" (for dashboard upcoming shows) ───────────
export const UPCOMING_STATUS_KEYS = ['planning','confirmed','picking','picked'];

// ─── Forward movement blocking rules ─────────────────────────────────────────
export const FORWARD_BLOCK_MESSAGES = {
  confirmed:    'Cannot move to Confirmed until the quote is confirmed.',
  picking:      'Cannot move to Picking until at least one item is picked.',
  picked:       'Cannot move to Picked until all assigned items are picked.',
  on_truck:     'Cannot move to On Truck until at least one item or container is scanned onto the truck.',
  on_location:  'Cannot move to On Location until all assigned items are scanned out.',
  needs_return: 'Cannot move to Needs Return until the planned return date has passed and gear is still out.',
  returning:    'Cannot move to Returning until at least one item is scanned back in.',
  finished:     'Cannot move to Finished until all gear is returned.',
};

/**
 * Evaluate whether a forward move to `targetKey` is allowed.
 * Returns { allowed: boolean, reason?: string }
 */
export function canMoveForward(targetKey, context) {
  const {
    quoteConfirmed,
    pickedCount,
    totalRequired,
    truckScannedCount,
    scannedOutCount,
    returnedCount,
    returnDate,
    now = new Date(),
  } = context;

  switch (targetKey) {
    case 'confirmed':
      if (!quoteConfirmed) return { allowed: false, reason: FORWARD_BLOCK_MESSAGES.confirmed };
      break;
    case 'picking':
      if (!(pickedCount > 0)) return { allowed: false, reason: FORWARD_BLOCK_MESSAGES.picking };
      break;
    case 'picked':
      if (totalRequired > 0 && pickedCount < totalRequired) return { allowed: false, reason: FORWARD_BLOCK_MESSAGES.picked };
      break;
    case 'on_truck':
      if (!(truckScannedCount > 0)) return { allowed: false, reason: FORWARD_BLOCK_MESSAGES.on_truck };
      break;
    case 'on_location':
      if (totalRequired > 0 && scannedOutCount < totalRequired) return { allowed: false, reason: FORWARD_BLOCK_MESSAGES.on_location };
      break;
    case 'needs_return':
      if (!returnDate) return { allowed: false, reason: FORWARD_BLOCK_MESSAGES.needs_return };
      if (new Date(returnDate) > now) return { allowed: false, reason: FORWARD_BLOCK_MESSAGES.needs_return };
      if (returnedCount >= totalRequired) return { allowed: false, reason: 'All gear is already returned.' };
      break;
    case 'returning':
      if (!(returnedCount > 0)) return { allowed: false, reason: FORWARD_BLOCK_MESSAGES.returning };
      break;
    case 'finished':
      if (totalRequired > 0 && returnedCount < totalRequired) return { allowed: false, reason: FORWARD_BLOCK_MESSAGES.finished };
      break;
  }
  return { allowed: true };
}