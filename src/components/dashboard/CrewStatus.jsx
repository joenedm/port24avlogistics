import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, AlertCircle } from 'lucide-react';

export default function CrewStatus({ projectCrew = [], users = [] }) {
  const totalCrew = projectCrew.length;
  const crewByRole = {};
  
  projectCrew.forEach(crew => {
    const role = crew.role || 'Unassigned';
    if (!crewByRole[role]) {
      crewByRole[role] = { count: 0, total_hours: 0, total_cost: 0 };
    }
    crewByRole[role].count += 1;
    crewByRole[role].total_hours += crew.hours || 0;
    crewByRole[role].total_cost += crew.billable_cost || 0;
  });

  const totalHours = projectCrew.reduce((sum, c) => sum + (c.hours || 0), 0);
  const totalCost = projectCrew.reduce((sum, c) => sum + (c.billable_cost || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-baseline gap-2 mb-1">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-3xl font-bold">{totalCrew}</p>
            </div>
            <p className="text-sm text-muted-foreground">Crew Members Assigned</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-baseline gap-2 mb-1">
              <Clock className="w-4 h-4 text-accent" />
              <p className="text-3xl font-bold">{totalHours.toFixed(0)}</p>
            </div>
            <p className="text-sm text-muted-foreground">Total Hours Scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Crew Labor Cost</p>
            <p className="text-3xl font-bold text-primary">${totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">By Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(crewByRole)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([role, data]) => (
                <div key={role} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <Badge variant="outline" className="mb-1">{role}</Badge>
                    <p className="text-xs text-muted-foreground">{data.total_hours.toFixed(0)} hours</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{data.count}</p>
                    <p className="text-xs text-muted-foreground">${data.total_cost.toFixed(2)}</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {totalCrew === 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex items-center gap-2 pt-6">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-700">No crew members assigned yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}