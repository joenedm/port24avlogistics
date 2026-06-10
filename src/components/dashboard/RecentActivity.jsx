import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import moment from 'moment';

const actionIcons = {
  check_out: ArrowUpFromLine,
  check_in: ArrowDownToLine,
  transfer: ArrowRightLeft,
  maintenance: Wrench,
};

const actionColors = {
  check_out: 'bg-amber-500/10 text-amber-500',
  check_in: 'bg-emerald-500/10 text-emerald-500',
  transfer: 'bg-primary/10 text-primary',
  maintenance: 'bg-orange-500/10 text-orange-500',
};

const actionLabels = {
  check_out: 'Checked Out',
  check_in: 'Checked In',
  transfer: 'Transferred',
  maintenance: 'Maintenance',
};

export default function RecentActivity({ movements }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {movements.slice(0, 8).map((m) => {
              const Icon = actionIcons[m.action] || ArrowRightLeft;
              return (
                <div key={m.id} className="flex items-center gap-3 py-1">
                  <div className={cn('p-1.5 rounded-lg shrink-0', actionColors[m.action])}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.asset_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {actionLabels[m.action]}{m.show_name ? ` → ${m.show_name}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {moment(m.created_date).fromNow()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}