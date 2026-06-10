import React from 'react';
import PageHeader from '@/components/shared/PageHeader';
import InvoiceBillingDashboard from '@/components/billing/InvoiceBillingDashboard';
import StripeConnectCard from '@/components/billing/StripeConnectCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AdminBilling() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Billing Administration"
        description="Manage invoices, payments, and integrations"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Dashboard */}
        <div className="lg:col-span-2">
          <InvoiceBillingDashboard />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <StripeConnectCard />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Billing System</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>✓ Unified invoice management</p>
              <p>✓ Multi-source payment tracking</p>
              <p>✓ Stripe integration ready</p>
              <p>✓ QuickBooks sync ready</p>
              <p>✓ Manual payment recording</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}