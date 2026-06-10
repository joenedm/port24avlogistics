import React, { useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import { DEFAULT_LAYOUTS } from '@/lib/dashboardWidgetRegistry';
import { useAuth } from '@/lib/AuthContext';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { userRecord } = useAuth();
  const user = userRecord;

  // Load user's saved layout (optional, render default immediately)
  const { data: userDashboard } = useQuery({
    queryKey: ['userDashboard', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const configs = await db.entities.UserDashboard.filter({ user_id: user.id });
      return configs[0] || null;
    },
    enabled: !!user?.id,
    staleTime: 60000
  });

  // Use default layout immediately, update when userDashboard loads
  const layout = useMemo(() => {
    if (userDashboard?.widgets) return userDashboard.widgets;
    const role = user?.role || 'admin';
    return DEFAULT_LAYOUTS[role] ?? DEFAULT_LAYOUTS['admin'] ?? null;
  }, [userDashboard, user?.role]);

  const handleLayoutChange = async (newLayout) => {
    try {
      if (userDashboard?.id) {
        await db.entities.UserDashboard.update(userDashboard.id, {
          widgets: newLayout,
          saved_at: new Date().toISOString()
        });
      } else {
        await db.entities.UserDashboard.create({
          user_id: user.id,
          user_role: user.role,
          widgets: newLayout,
          saved_at: new Date().toISOString()
        });
      }
      queryClient.invalidateQueries({ queryKey: ['userDashboard'] });
    } catch (err) {
      console.error('Failed to save layout:', err);
    }
  };

  return (
    <div className="space-y-0">
      <PageHeader
        title="Dashboard"
        description="Customizable operations command center"
      />

      {layout && (
        <DashboardGrid
          userRole={user?.role || 'admin'}
          initialLayout={layout}
          onLayoutChange={handleLayoutChange}
        />
      )}
    </div>
  );
}