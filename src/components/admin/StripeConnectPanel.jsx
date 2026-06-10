import { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle2, Link as LinkIcon, Trash2, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

export default function StripeConnectPanel() {
  const queryClient = useQueryClient();
  const [disconnecting, setDisconnecting] = useState(false);

  // Fetch Stripe account
  const { data: stripeAccount, isLoading, error } = useQuery({
    queryKey: ['stripeAccount'],
    queryFn: async () => {
      const accounts = await db.entities.StripeAccount.list();
      return accounts[0] || null;
    }
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      if (stripeAccount?.id) {
        return db.entities.StripeAccount.update(stripeAccount.id, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripeAccount'] });
      toast.success('Stripe settings updated');
    },
    onError: (err) => {
      toast.error('Failed to update: ' + err.message);
    }
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: () => db.functions.invoke('disconnectStripe', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripeAccount'] });
      toast.success('Stripe disconnected');
      setDisconnecting(false);
    },
    onError: (err) => {
      toast.error('Failed to disconnect: ' + err.message);
      setDisconnecting(false);
    }
  });

  // Sync account status mutation
  const syncMutation = useMutation({
    mutationFn: () => db.functions.invoke('syncStripeAccountStatus', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripeAccount'] });
      toast.success('Stripe status synced');
    },
    onError: (err) => {
      toast.error('Failed to sync: ' + err.message);
    }
  });

  // Start OAuth flow
  const connectMutation = useMutation({
    mutationFn: () => db.functions.invoke('initiateStripeConnect', {}),
    onSuccess: (response) => {
      if (response.data?.redirect_url) {
        window.location.href = response.data.redirect_url;
      }
    },
    onError: (err) => {
      toast.error('Failed to initiate Stripe Connect: ' + err.message);
    }
  });

  const handleConnectStripe = () => {
    connectMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
            Loading Stripe settings...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error?.status === 500 || error?.message?.includes('not configured')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stripe Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-amber-700">Stripe Not Configured</h4>
                <p className="text-xs text-amber-600 mt-1">To enable Stripe Connect, contact your admin to set the environment variables: STRIPE_CLIENT_ID and STRIPE_CLIENT_SECRET.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Stripe Integration</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Accept payments securely via Stripe</p>
          </div>
          {stripeAccount?.is_connected && (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        {stripeAccount?.is_connected ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-sm text-emerald-700">Stripe Connected</h4>
                <p className="text-xs text-emerald-600 mt-1">{stripeAccount.account_name}</p>
                {stripeAccount.connected_at && (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Connected {new Date(stripeAccount.connected_at).toLocaleDateString()} by {stripeAccount.connected_by}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-amber-700">Not Connected</h4>
                <p className="text-xs text-amber-600 mt-1">Connect your Stripe account to accept client payments and issue invoices.</p>
              </div>
            </div>
          </div>
        )}

        {/* Connection Button */}
        {!stripeAccount?.is_connected ? (
          <Button onClick={handleConnectStripe} disabled={connectMutation.isPending} className="w-full gap-2">
            <LinkIcon className="h-4 w-4" />
            {connectMutation.isPending ? 'Redirecting...' : 'Connect Stripe Account'}
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Settings */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Invoice Payment Page</p>
                  <p className="text-xs text-muted-foreground">Clients can pay invoices via Stripe hosted page</p>
                </div>
                <Switch
                  checked={stripeAccount?.payment_page_enabled !== false}
                  onCheckedChange={(checked) =>
                    updateMutation.mutate({ payment_page_enabled: checked })
                  }
                  disabled={updateMutation.isPending}
                />
              </div>
            </div>

            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Customer Portal</p>
                  <p className="text-xs text-muted-foreground">Clients can manage payment methods and view billing history</p>
                </div>
                <Switch
                  checked={stripeAccount?.customer_portal_enabled !== false}
                  onCheckedChange={(checked) =>
                    updateMutation.mutate({ customer_portal_enabled: checked })
                  }
                  disabled={updateMutation.isPending}
                />
              </div>
            </div>

            {/* Default Payment Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Payment Method</label>
              <select
                value={stripeAccount?.default_payment_method || 'all'}
                onChange={(e) => updateMutation.mutate({ default_payment_method: e.target.value })}
                disabled={updateMutation.isPending}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
              >
                <option value="all">All Payment Methods</option>
                <option value="card">Card Only</option>
                <option value="bank_transfer">Bank Transfer Only</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="gap-1"
              >
                <RotateCw className="h-4 w-4" />
                {syncMutation.isPending ? 'Syncing...' : 'Sync Status'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (window.confirm('Disconnect Stripe? You won\'t be able to accept payments until you reconnect.')) {
                    setDisconnecting(true);
                    disconnectMutation.mutate();
                  }
                }}
                disabled={disconnectMutation.isPending || disconnecting}
                className="gap-1 ml-auto"
              >
                <Trash2 className="h-4 w-4" />
                Disconnect
              </Button>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="flex gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>OAuth:</strong> You'll be redirected to Stripe to securely authorize Port 24. No API keys are stored.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}