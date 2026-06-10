import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, CheckCircle, X } from 'lucide-react';

const TYPE_COLORS = {
  production: 'bg-primary/10 text-primary',
  billing: 'bg-emerald-500/10 text-emerald-600',
  quote_layout: 'bg-blue-500/10 text-blue-600',
  crew: 'bg-purple-500/10 text-purple-600',
  venue_logistics: 'bg-orange-500/10 text-orange-600',
  equipment: 'bg-amber-500/10 text-amber-600',
  show_style: 'bg-teal-500/10 text-teal-600',
};

export default function ShowClientPreferenceApplier({ clientId, venueId, onApply }) {
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState([]);

  const { data: clientPrefs = [] } = useQuery({
    queryKey: ['client-prefs-apply', clientId],
    queryFn: () => base44.entities.ClientPreference.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: venuePrefs = [] } = useQuery({
    queryKey: ['venue-prefs-apply', venueId],
    queryFn: () => base44.entities.ClientPreference.filter({ venue_id: venueId }),
    enabled: !!venueId,
  });

  const allPrefs = [...clientPrefs, ...venuePrefs].filter(p => p.is_active !== false);

  if (allPrefs.length === 0) return null;

  const handleApply = (pref) => {
    const updates = {};
    if (pref.preference_type === 'production') {
      if (pref.production_notes) updates.notes = pref.production_notes;
    }
    if (pref.preference_type === 'billing') {
      if (pref.billing_notes) updates.billing_notes = pref.billing_notes;
    }
    if (pref.preference_type === 'venue_logistics') {
      if (pref.venue_logistics_notes) updates.venue_notes = pref.venue_logistics_notes;
    }
    onApply?.(updates, pref);
    setApplied(prev => [...prev, pref.id]);
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Sparkles className="w-4 h-4 text-primary" /> Saved Preferences ({allPrefs.length})
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Client Preferences
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Apply saved preferences to this project, or use them as a reference.</p>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {allPrefs.map(pref => {
              const isApplied = applied.includes(pref.id);
              return (
                <Card key={pref.id} className={isApplied ? 'border-primary/40 bg-primary/5' : ''}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{pref.name}</p>
                          <Badge variant="outline" className={`text-xs ${TYPE_COLORS[pref.preference_type] || ''}`}>
                            {pref.preference_type?.replace(/_/g, ' ')}
                          </Badge>
                          {pref.venue_id && <Badge variant="outline" className="text-xs">Venue</Badge>}
                        </div>
                        {pref.production_notes && <p className="text-xs text-muted-foreground">{pref.production_notes}</p>}
                        {pref.equipment_notes && <p className="text-xs text-muted-foreground">{pref.equipment_notes}</p>}
                        {pref.crew_preferences && <p className="text-xs text-muted-foreground">{pref.crew_preferences}</p>}
                        {pref.show_style_notes && <p className="text-xs text-muted-foreground">{pref.show_style_notes}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant={isApplied ? 'secondary' : 'default'}
                        className="shrink-0 gap-1.5 h-8"
                        onClick={() => handleApply(pref)}
                        disabled={isApplied}
                      >
                        {isApplied ? <><CheckCircle className="w-3 h-3" /> Applied</> : 'Apply'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}