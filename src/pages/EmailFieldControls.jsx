import React from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/shared/PageHeader';

const DEFAULT_FIELDS = [
  { field_name: 'project_name', display_label: 'Project Name' },
  { field_name: 'crew_name', display_label: 'Crew Member' },
  { field_name: 'role', display_label: 'Role' },
  { field_name: 'date', display_label: 'Date' },
  { field_name: 'start_time', display_label: 'Start Time' },
  { field_name: 'end_time', display_label: 'End Time' },
  { field_name: 'location', display_label: 'Location' },
  { field_name: 'notes', display_label: 'Notes' },
];

export default function EmailFieldControls() {
  const queryClient = useQueryClient();

  const { data: fieldControls = [] } = useQuery({
    queryKey: ['emailFieldControls'],
    queryFn: () => db.entities.EmailFieldControl.list()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.EmailFieldControl.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emailFieldControls'] })
  });

  // Initialize missing fields
  React.useEffect(() => {
    const existingFields = fieldControls.map(f => f.field_name);
    const missingFields = DEFAULT_FIELDS.filter(f => !existingFields.includes(f.field_name));

    missingFields.forEach(field => {
      db.entities.EmailFieldControl.create({
        field_name: field.field_name,
        display_label: field.display_label,
        is_visible: true
      });
    });
  }, []);

  const displayFields = fieldControls.length > 0 ? fieldControls : DEFAULT_FIELDS.map(f => ({ ...f, is_visible: true }));

  const toggleField = (field) => {
    if (!field.id) {
      // Create if doesn't exist
      db.entities.EmailFieldControl.create({
        field_name: field.field_name,
        display_label: field.display_label,
        is_visible: !field.is_visible
      }).then(() => queryClient.invalidateQueries({ queryKey: ['emailFieldControls'] }));
    } else {
      updateMutation.mutate({ id: field.id, data: { is_visible: !field.is_visible } });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Field Controls"
        description="Choose which fields appear in crew confirmation emails"
      />

      <Card>
        <CardHeader>
          <CardTitle>Visible Fields in Crew Assignment Emails</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            Only enabled fields will be shown in the email body. Disable fields to keep emails clean and focused.
          </p>

          <div className="space-y-4">
            {displayFields.map((field) => (
              <div key={field.field_name} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                <div>
                  <Label className="text-base font-medium cursor-pointer">{field.display_label}</Label>
                  <p className="text-xs text-muted-foreground mt-1">{field.field_name}</p>
                </div>
                <Switch
                  checked={field.is_visible !== false}
                  onCheckedChange={() => toggleField(field)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        <p>💡 <strong>Tip:</strong> Keep only essential fields visible to make emails scannable and professional.</p>
      </div>
    </div>
  );
}