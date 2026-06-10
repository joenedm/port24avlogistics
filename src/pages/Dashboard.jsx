import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import { DEFAULT_LAYOUTS } from '@/lib/dashboardWidgetRegistry';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      const me = await base44.auth.me();
      setUser(me);
    };
    loadUser();
  }, []);

  // Load user's saved layout (optional, render default immediately)
  const { data: userDashboard } = useQuery({
    queryKey: ['userDashboard', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const configs = await base44.entities.UserDashboard.filter({ user_id: user.id });
      return configs[0] || null;
    },
    enabled: !!user?.id,
    staleTime: 60000 // 1 minute
  });

  // Use default layout immediately, update when userDashboard loads
  const layout = useMemo(() => {
    if (userDashboard?.widgets) return userDashboard.widgets;
    if (user?.role && DEFAULT_LAYOUTS[user.role]) return DEFAULT_LAYOUTS[user.role];
    return null;
  }, [userDashboard, user?.role]);

  const handleLayoutChange = async (newLayout) => {
    try {
      if (userDashboard?.id) {
        await base44.entities.UserDashboard.update(userDashboard.id, {
          widgets: newLayout,
          saved_at: new Date().toISOString()
        });
      } else {
        await base44.entities.UserDashboard.create({
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

      {layout && user && (
        <DashboardGrid
          userRole={user.role}
          initialLayout={layout}
          onLayoutChange={handleLayoutChange}
        />
      )}
    </div>
  );
}