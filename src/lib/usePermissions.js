import { useAuth } from '@/lib/AuthContext';

// ─── Role level hierarchy ───────────────────────────────────────────────────
const ROLE_LEVEL = { admin: 5, director: 4, manager: 3, coordinator: 2, crew: 1 };

// ─── Role metadata ───────────────────────────────────────────────────────────
export const ROLE_DESCRIPTIONS = {
  admin:       { label: 'Admin',       desc: 'Full access to everything including admin settings, quotes & invoices, business analytics, and roundtable.' },
  director:    { label: 'Director',    desc: 'Full operational access — shows, crew, inventory, quotes & invoices, mission control, and roundtable.' },
  manager:     { label: 'Manager',     desc: 'Manage shows, crew, and equipment. No admin settings, finance, or roundtable.' },
  coordinator: { label: 'Coordinator', desc: 'Limited editing — shows, crew assignments, and inventory support only.' },
  crew:        { label: 'Crew',        desc: 'Crew portal and assigned jobs only.' },
};

// ─── Centralized permission flags by role ───────────────────────────────────
const PERMISSIONS = {
  admin: {
    canAccessAdmin:        true,
    canAccessFinance:      true,
    canAccessMissionControl: true,
    canManageUsers:        true,
    canManageCrew:         true,
    canManageEquipment:    true,
    canEditShows:          true,
    canViewInventory:      true,
    canViewCrew:           true,
    canAccessBusiness:     true,
    canAccessPrintTemplates: true,
    canViewOwnProfile:     true,
    canAccessRoundtable:   true,
  },
  director: {
    canAccessAdmin:        false,
    canAccessFinance:      true,
    canAccessMissionControl: true,
    canManageUsers:        false,
    canManageCrew:         true,
    canManageEquipment:    true,
    canEditShows:          true,
    canViewInventory:      true,
    canViewCrew:           true,
    canAccessBusiness:     true,
    canAccessPrintTemplates: true,
    canViewOwnProfile:     true,
    canAccessRoundtable:   true,
  },
  manager: {
    canAccessAdmin:        false,
    canAccessFinance:      false,
    canAccessMissionControl: false,
    canManageUsers:        false,
    canManageCrew:         true,
    canManageEquipment:    true,
    canEditShows:          true,
    canViewInventory:      true,
    canViewCrew:           true,
    canAccessBusiness:     true,
    canAccessPrintTemplates: true,
    canViewOwnProfile:     true,
    canAccessRoundtable:   false,
  },
  coordinator: {
    canAccessAdmin:        false,
    canAccessFinance:      false,
    canAccessMissionControl: false,
    canManageUsers:        false,
    canManageCrew:         false,
    canManageEquipment:    false,
    canEditShows:          true,
    canViewInventory:      true,
    canViewCrew:           true,
    canAccessBusiness:     false,
    canAccessPrintTemplates: false,
    canViewOwnProfile:     true,
    canAccessRoundtable:   false,
  },
  crew: {
    canAccessAdmin:        false,
    canAccessFinance:      false,
    canAccessMissionControl: false,
    canManageUsers:        false,
    canManageCrew:         false,
    canManageEquipment:    false,
    canEditShows:          false,
    canViewInventory:      false,
    canViewCrew:           false,
    canAccessBusiness:     false,
    canAccessPrintTemplates: false,
    canViewOwnProfile:     true,
    canAccessRoundtable:   false,
  },
};

// ─── Route prefix allow-lists per role ──────────────────────────────────────
// Admin gets '*' (all routes). Others get an explicit list.
const ALLOWED_ROUTE_PREFIXES = {
  admin: '*',
  director: [
    '/', '/shows', '/live', '/crew', '/scan', '/av-hospital',
    '/crew-members', '/crew-bookings', '/crew-booking',
    '/assets', '/kits', '/categories', '/movements',
    '/availability', '/alerts',
    '/quotes', '/invoices',
    '/mission-control', '/utilization',
    '/print-templates', '/crew-dashboard', '/my-profile',
    '/roundtable',
  ],
  manager: [
    '/', '/shows', '/live', '/crew', '/scan', '/av-hospital',
    '/crew-members', '/crew-bookings', '/crew-booking',
    '/assets', '/kits', '/categories', '/movements',
    '/availability', '/alerts',
    '/print-templates', '/crew-dashboard',
    '/labor-rates', '/crew-roles', '/my-profile',
  ],
  coordinator: [
    '/', '/shows', '/live', '/crew', '/scan', '/av-hospital',
    '/crew-members', '/crew-bookings', '/crew-booking',
    '/assets', '/kits', '/categories', '/movements',
    '/crew-dashboard', '/my-profile',
  ],
  crew: [
    '/crew', '/scan', '/crew-dashboard', '/my-profile',
  ],
};

// ─── canAccessRoute ──────────────────────────────────────────────────────────
export function canAccessRoute(role, pathname) {
  const allowed = ALLOWED_ROUTE_PREFIXES[role];
  if (!allowed) return false;        // unknown role → deny
  if (allowed === '*') return true;  // admin → allow all

  // exact '/' must match exactly
  if (pathname === '/') return allowed.includes('/');

  return allowed.some(prefix => prefix !== '/' && pathname.startsWith(prefix));
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function usePermissions() {
  const { userRecord } = useAuth();
  // App owner/builder (collaborator_role === 'editor') always gets admin
  const isAppOwner = userRecord?.collaborator_role === 'editor';
  const role = isAppOwner ? 'admin' : (userRecord?.role || 'crew');

  if (import.meta.env.DEV) {
    console.log('[Permissions] role:', role, '| userRecord email:', userRecord?.email, '| raw record.role:', userRecord?.role);
  }

  const perms = PERMISSIONS[role] || PERMISSIONS.crew;
  const level = ROLE_LEVEL[role] || 1;

  // Scan/Pick unlocks from Confirmed onward (canonical keys + legacy keys for DB compat).
  // Admin and Director can always access regardless of show status.
  const SCAN_PICK_UNLOCKED = new Set([
    'confirmed','picking','picked','on_truck','on_location','needs_return','returning','finished',
    // Legacy keys still in DB
    'load_out','on_site','strike','returned','completed',
  ]);
  const canScanPickShow = (showStatus) => {
    if (level >= 4) return true; // admin / director always allowed
    return SCAN_PICK_UNLOCKED.has(showStatus);
  };

  return {
    role,
    level,
    isAdmin:              role === 'admin',
    isDirectorOrAbove:    level >= 4,
    isManagerOrAbove:     level >= 3,
    isCoordinatorOrAbove: level >= 2,
    canAccessRoute:       (path) => canAccessRoute(role, path),
    canScanPickShow,
    ...perms,
  };
}