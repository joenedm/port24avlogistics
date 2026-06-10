import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Link as LinkIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StripeConnectCard() {
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch Stripe connection status
  const { data: stripeAccount, isLoading, refetch } = useQuery({
    queryKey: ['stripeAccount'],
    queryFn: async () => {
      try {
        const accounts = await base44.entities.StripeAccount.list();
        return accounts[0] || null;
      } catch {
        return null;
      }
    }
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      setIsConnecting(true);
      const response = await base44.functions.invoke('initiateStripeConnect', {});
      
      if (response.data?.redirect_url) {
        const popup = window.open(response.data.redirect_url, '_blank');
        
        // Poll for OAuth completion
        const timer = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(timer);
            setTimeout(() => refetch(), 1000);
            setIsConnecting(false);
            toast.success('Stripe account connected!');
          }
        }, 500);
      }
    },
    onError: (err) => {
      setIsConnecting(false);
      toast.error('Failed to connect: ' + err.message);
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await base44.functions.invoke('disconnectStripe', {});
      refetch();
    },
    onSuccess: () => {
      toast.success('Stripe disconnected');
      queryClient.invalidateQueries({ queryKey: ['stripeAccount'] });
    },
    onError: (err) => {
      toast.error('Failed to disconnect: ' + err.message);
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
            Loading Stripe status...
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
            <CardTitle>Stripe Connect</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Connect your Stripe account to accept client payments</p>
          </div>
          {stripeAccount?.is_connected && (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!stripeAccount?.is_connected ? (
          <>
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-sm text-amber-700">Not Connected</h4>
                  <p className="text-xs text-amber-600 mt-1">Connect your Stripe account to process client payments securely.</p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending || isConnecting}
              className="w-full gap-2"
            >
              <LinkIcon className="h-4 w-4" />
              {isConnecting || connectMutation.isPending ? 'Redirecting to Stripe...' : 'Connect Stripe Account'}
            </Button>
          </>
        ) : (
          <>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-sm text-emerald-700">Stripe Connected</h4>
                  <p className="text-xs text-emerald-600 mt-1">Your Stripe account is ready to process payments.</p>
                </div>
              </div>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (window.confirm('Disconnect Stripe? You won\'t be able to accept payments until you reconnect.')) {
                  disconnectMutation.mutate();
                }
              }}
              disabled={disconnectMutation.isPending}
              className="w-full gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Disconnect
            </Button>
          </>
        )}

        <div className="flex gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            You'll be securely redirected to Stripe to authorize. Your payments flow through your own Stripe account.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}