import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Building2, Star, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import ClientFormDialog from '@/components/crm/ClientFormDialog';

const STATUS_COLORS = {
  active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  inactive: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  prospect: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  vip: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

export default function Clients() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const filtered = clients.filter(c => {
    const matchSearch = !search || c.company_name?.toLowerCase().includes(search.toLowerCase()) || c.display_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Companies, contacts, and relationship management"
        actions={
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Company
          </Button>
        }
      />

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Card key={i}><CardContent className="h-32 animate-pulse bg-muted rounded" /></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No clients found</p>
          <p className="text-sm mt-1">Add your first company to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => (
            <Link key={client.id} to={`/clients/${client.id}`}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{client.company_name}</p>
                        {client.display_name && client.display_name !== client.company_name && (
                          <p className="text-xs text-muted-foreground truncate">{client.display_name}</p>
                        )}
                      </div>
                    </div>
                    {client.status === 'vip' && <Star className="w-4 h-4 text-amber-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[client.status] || STATUS_COLORS.active}`}>
                      {client.status || 'active'}
                    </Badge>
                    {client.po_required && <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">PO Req.</Badge>}
                    {client.coi_required && <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">COI Req.</Badge>}
                    {client.total_shows > 0 && <span className="text-xs text-muted-foreground ml-auto">{client.total_shows} shows</span>}
                  </div>
                  {client.industry && <p className="text-xs text-muted-foreground mt-2">{client.industry}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ClientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={() => queryClient.invalidateQueries({ queryKey: ['clients'] })} />
    </div>
  );
}