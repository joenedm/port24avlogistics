import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, CalendarDays, ScanBarcode,
  Settings, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Boxes, History,
  LogOut, Archive, Bell, TrendingUp, Upload, Users, FileText, DollarSign, Palette, CalendarRange, HeartPulse, Briefcase, Telescope, UserCircle, Handshake, Tag, ClipboardList, Building2, MapPin, Truck, Printer
} from 'lucide-react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/lib/usePermissions';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


function Port24Icon() {
  return <img src="/port24-logo.svg" alt="Port 24" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />;
}

function Port24Logo() {
  return (
    <div className="flex items-center min-w-0">
      <img src="/port24-logo.svg" alt="Port 24" style={{ height: 28, width: 'auto', objectFit: 'contain', maxWidth: 140 }} />
    </div>
  );
}

// Persist which groups are collapsed in localStorage — stays until user reopens them
const STORAGE_KEY = 'sidebar_collapsed_groups';
function loadCollapsedGroups() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(loadCollapsedGroups);

  const toggleGroup = (label) => {
    setCollapsedGroups(prev => {
      const next = { ...prev, [label]: !prev[label] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };
  const location = useLocation();
  const { role, canAccessAdmin, canAccessFinance, canAccessMissionControl, canManageCrew, canViewInventory, canAccessBusiness, canAccessPrintTemplates, canViewOwnProfile, canAccessRoundtable } = usePermissions();

  if (import.meta.env.DEV) {
    console.log('[Sidebar] rendering for role:', role);
  }
  const isAdmin = role === 'admin';
  const level = { admin: 5, director: 4, manager: 3, coordinator: 2, crew: 1 }[role] || 1;

  const navGroups = (() => {
    const groups = [];

    // Operations — everyone gets access to scan portal (permissions handled inside the page)
    const opsItems = [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/shows', icon: CalendarDays, label: 'Projects' },
      { path: '/scan', icon: ScanBarcode, label: 'Scan' },
    ];
    if (level >= 2) opsItems.push({ path: '/av-hospital', icon: HeartPulse, label: 'AV Hospital', badge: 'hospital' });
    if (role !== 'crew') groups.push({ label: 'Operations', items: opsItems });
    else groups.push({ label: 'Operations', items: [{ path: '/scan', icon: ScanBarcode, label: 'Scan' }] });

    // Crew management — manager+
    if (canManageCrew) {
      groups.push({
        label: 'Crew',
        items: [
          { path: '/crew-members', icon: Users, label: 'Employees' },
          { path: '/crew-bookings', icon: Briefcase, label: 'Crew Bookings' },
        ]
      });
    } else if (canViewOwnProfile) {
      // Crew/coordinator: only see own profile
      groups.push({
        label: 'My Portal',
        items: [
          { path: '/my-profile', icon: UserCircle, label: 'My Profile' },
        ]
      });
    }

    // Inventory — coordinator+
    if (canViewInventory) {
    groups.push({
      label: 'Inventory',
      items: [
        { path: '/assets', icon: Package, label: 'Assets' },
        { path: '/kits', icon: Archive, label: 'Kits' },
        { path: '/assign-barcode', icon: Tag, label: 'Assign Barcodes' },
        { path: '/categories', icon: Boxes, label: 'Categories' },
        { path: '/movements', icon: History, label: 'Movement Log' },
        { path: '/containers', icon: Archive, label: 'Containers' },
        { path: '/yearly-review', icon: ClipboardList, label: 'Asset Reviews' },
      ]
    });
    }

    // CRM — manager+
    if (level >= 3) {
      groups.push({
        label: 'CRM',
        items: [
          { path: '/clients', icon: Building2, label: 'Clients' },
          { path: '/venues', icon: MapPin, label: 'Venues' },
        ]
      });
    }

    // Business — director+ (Mission Control + Roundtable only)
    if (canAccessBusiness) {
      const businessItems = [
        { path: '/availability', icon: CalendarRange, label: 'Availability' },
        { path: '/alerts', icon: Bell, label: 'Alerts', badge: true },
      ];
      if (canAccessMissionControl) {
        businessItems.push({ path: '/mission-control', icon: Telescope, label: 'Mission Control' });
      }
      if (canAccessRoundtable) {
        businessItems.push({ path: '/roundtable', icon: Handshake, label: 'Roundtable' });
      }
      groups.push({ label: 'Business', items: businessItems });
    }

    // Quotes & Invoices — director+
    if (canAccessFinance) {
      groups.push({
        label: 'Quotes & Invoices',
        items: [
          { path: '/quotes', icon: FileText, label: 'Quotes' },
          { path: '/invoices', icon: DollarSign, label: 'Invoices' },
          { path: '/billing', icon: TrendingUp, label: 'Billing Dashboard' },
        ]
      });
    }

    // Admin — admin only
    if (canAccessAdmin) {
      groups.push({
        label: 'Admin',
        items: [
          { path: '/print-templates', icon: FileText, label: 'Print Templates' },
          { path: '/document-settings', icon: Printer, label: 'Documents & PDFs' },
          { path: '/admin', icon: Settings, label: 'Settings' },
        ]
      });
    } else if (canAccessPrintTemplates) {
      groups.push({
        label: 'Admin',
        items: [
          { path: '/print-templates', icon: FileText, label: 'Print Templates' },
          { path: '/document-settings', icon: Printer, label: 'Documents & PDFs' },
        ]
      });
    }

    return groups;
  })();

  const { data: brandList = [] } = useQuery({ queryKey: ['brand'], queryFn: () => db.entities.BrandSettings.list(), staleTime: 10 * 60 * 1000 });
  const brand = brandList[0] || {};

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => db.entities.Alert.list('-created_date', 50),
    staleTime: 2 * 60 * 1000,
  });
  const unreadAlerts = alerts.filter(a => !a.is_resolved && !a.is_read).length;

  const { data: hospitalRecords = [] } = useQuery({
    queryKey: ['avhospital'],
    queryFn: () => db.entities.AVHospital.list('-created_date', 50),
    staleTime: 2 * 60 * 1000,
  });
  const activeHospital = hospitalRecords.filter(r => r.is_active).length;

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground z-40 flex flex-col transition-all duration-300 border-r border-sidebar-border",
      collapsed ? "w-16" : "w-60"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {brand.logo_url
                ? <img src={brand.logo_url} alt="Logo" className="h-8 max-w-[120px] object-contain" />
                : <Port24Logo />
                }
            </div>
            <button onClick={() => setCollapsed(true)} className="p-1 rounded-md hover:bg-sidebar-accent transition-colors shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto cursor-pointer" onClick={() => setCollapsed(false)}>
            {brand.logo_url
              ? <img src={brand.logo_url} alt="" className="w-6 h-6 object-contain" />
              : <Port24Icon />}
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {navGroups.map(group => {
          const isGroupCollapsed = !collapsed && !!collapsedGroups[group.label];
          return (
            <div key={group.label} className="mb-3">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center justify-between w-full px-3 mb-1 group"
                >
                  <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider group-hover:text-sidebar-foreground/60 transition-colors">
                    {group.label}
                  </p>
                  {isGroupCollapsed
                    ? <ChevronRight className="w-3 h-3 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 transition-colors" />
                    : <ChevronDown className="w-3 h-3 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 transition-colors" />
                  }
                </button>
              )}
              {!isGroupCollapsed && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path ||
                      (item.path !== '/' && location.pathname.startsWith(item.path));
                    const alertCount = item.badge === true ? unreadAlerts : item.badge === 'hospital' ? activeHospital : 0;

                    const cls = cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 w-full",
                      isActive
                        ? "text-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    );
                    const activeStyle = isActive ? { backgroundColor: 'hsl(var(--primary) / 0.15)' } : {};

                    const inner = (
                      <>
                        <item.icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
                        {!collapsed && (
                          <>
                            <span className="text-sm font-medium truncate flex-1">{item.label}</span>
                            {alertCount > 0 && <Badge className="h-4 px-1 text-xs bg-red-500/10 text-red-600 border-red-500/20 shrink-0">{alertCount}</Badge>}
                          </>
                        )}
                      </>
                    );

                    return item.external
                      ? <a key={item.path} href={item.path} className={cls} style={activeStyle}>{inner}</a>
                      : <Link key={item.path} to={item.path} className={cls} style={activeStyle}>{inner}</Link>;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border">
        {collapsed && (
          <button onClick={() => setCollapsed(false)} className="w-full p-2 rounded-lg hover:bg-sidebar-accent transition-colors flex justify-center mb-1">
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => db.auth.logout()}
          className={cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-sidebar-foreground hover:bg-sidebar-accent", collapsed && "justify-center")}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-sm">Log out</span>}
        </button>
      </div>
    </aside>
  );
}