import React from 'react';
import { Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const ROLES = ['admin', 'director', 'manager', 'coordinator', 'crew'];

// Navigation sections → which permission flag gates each section/feature
const NAV_STRUCTURE = [
  {
    section: 'Operations',
    items: [
      { label: 'Dashboard',       roles: ['admin', 'director', 'manager', 'coordinator'] },
      { label: 'Projects',        roles: ['admin', 'director', 'manager', 'coordinator'] },
      { label: 'Scan',            roles: ['admin', 'director', 'manager', 'coordinator', 'crew'] },
      { label: 'AV Hospital',     roles: ['admin', 'director', 'manager', 'coordinator'] },
    ],
  },
  {
    section: 'Crew',
    items: [
      { label: 'Employees',       roles: ['admin', 'director', 'manager'] },
      { label: 'Crew Bookings',   roles: ['admin', 'director', 'manager'] },
      { label: 'My Profile',      roles: ['coordinator', 'crew'] },
    ],
  },
  {
    section: 'Inventory',
    items: [
      { label: 'Assets',          roles: ['admin', 'director', 'manager', 'coordinator'] },
      { label: 'Kits',            roles: ['admin', 'director', 'manager', 'coordinator'] },
      { label: 'Categories',      roles: ['admin', 'director', 'manager', 'coordinator'] },
      { label: 'Movement Log',    roles: ['admin', 'director', 'manager', 'coordinator'] },
    ],
  },
  {
    section: 'Business',
    items: [
      { label: 'Availability',    roles: ['admin', 'director', 'manager'] },
      { label: 'Alerts',          roles: ['admin', 'director', 'manager'] },
      { label: 'Mission Control', roles: ['admin', 'director'] },
      { label: 'Roundtable',      roles: ['admin', 'director'] },
    ],
  },
  {
    section: 'Quotes & Invoices',
    items: [
      { label: 'Quotes',          roles: ['admin', 'director'] },
      { label: 'Invoices',        roles: ['admin', 'director'] },
    ],
  },
  {
    section: 'Admin',
    items: [
      { label: 'Print Templates', roles: ['admin', 'director', 'manager'] },
      { label: 'Admin Settings',  roles: ['admin'] },
    ],
  },
];

const ROLE_LABELS = {
  admin: 'Admin',
  director: 'Director',
  manager: 'Manager',
  coordinator: 'Coordinator',
  crew: 'Crew',
};

export default function PermissionsMatrix() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Read-only reference showing which roles can access each navigation section. Role assignments are managed in the Users tab.
      </p>

      {NAV_STRUCTURE.map(group => (
        <Card key={group.section}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">{group.section}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground w-40">Feature</th>
                    {ROLES.map(r => (
                      <th key={r} className="px-3 py-2 font-medium text-muted-foreground text-center w-24">
                        {ROLE_LABELS[r]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item, i) => (
                    <tr key={item.label} className={cn('border-b last:border-0', i % 2 === 1 && 'bg-muted/10')}>
                      <td className="px-4 py-2.5 font-medium">{item.label}</td>
                      {ROLES.map(r => {
                        const allowed = item.roles.includes(r);
                        return (
                          <td key={r} className="px-3 py-2.5 text-center">
                            {allowed
                              ? <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                              : <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                            }
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}