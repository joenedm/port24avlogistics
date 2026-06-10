import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import { usePermissions } from '@/lib/usePermissions';

export default function Quotes() {
  const { canAccessFinance } = usePermissions();
  const [showSelectOpen, setShowSelectOpen] = useState(false);
  const navigate = useNavigate();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => db.entities.Quote.list('-updated_date'),
  });

  const { data: shows = [] } = useQuery({
    queryKey: ['shows'],
    queryFn: () => db.entities.Show.list(),
  });

  const handleCreateQuote = (showId) => {
    setShowSelectOpen(false);
    navigate(`/quotes/${showId}`);
  };

  const statusColors = {
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-blue-500/10 text-blue-600',
    approved: 'bg-emerald-500/10 text-emerald-600',
    confirmed: 'bg-emerald-600/15 text-emerald-500',
    declined: 'bg-red-500/10 text-red-600',
    expired: 'bg-amber-500/10 text-amber-600',
  };

  return (
    <div>
      <PageHeader
        title="Quotes"
        description="View and manage all your quotes"
        actions={
          canAccessFinance ? (
            <Button onClick={() => setShowSelectOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Quote
            </Button>
          ) : null
        }
      />

      <Dialog open={showSelectOpen} onOpenChange={setShowSelectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select a Show</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {shows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No shows available. Create a show first.</p>
            ) : (
              shows.map(show => (
                <button
                  key={show.id}
                  onClick={() => handleCreateQuote(show.id)}
                  className="w-full text-left p-3 rounded-lg border border-input hover:bg-accent transition-colors"
                >
                  <p className="font-medium text-sm">{show.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{show.client || 'No client'}</p>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-20">Loading quotes...</p>
      ) : quotes.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No quotes yet. Create a quote from a show to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {quotes.map(quote => {
            const show = shows.find(s => s.id === quote.show_id);
            return (
              <Card key={quote.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{quote.show_name}</h3>
                      <Badge className={`text-xs border ${statusColors[quote.status] || statusColors.draft}`}>{quote.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{quote.client || 'No client'}</p>
                    {show && show.start_date && !isNaN(new Date(show.start_date)) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(show.start_date), 'MMM d')}
                        {show.end_date && !isNaN(new Date(show.end_date)) ? ` — ${format(new Date(show.end_date), 'MMM d, yyyy')}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right mr-4">
                    <p className="font-bold text-lg">${quote.total?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</p>
                    <p className="text-xs text-muted-foreground">{quote.line_items?.length || 0} items</p>
                  </div>
                  <Link to={`/quotes/${quote.show_id}`}>
                    <Button variant="outline" size="sm">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}