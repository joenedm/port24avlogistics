import React, { useState } from 'react';
import { Shield, Handshake } from 'lucide-react';
import { usePermissions } from '@/lib/usePermissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RoundtablePartners from '@/components/roundtable/RoundtablePartners';
import RoundtableInventory from '@/components/roundtable/RoundtableInventory';
import RoundtableActiveSubrents from '@/components/roundtable/RoundtableActiveSubrents';

export default function Roundtable() {
  const { isDirectorOrAbove } = usePermissions();

  if (!isDirectorOrAbove) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground max-w-sm">Roundtable is only available to Directors and Admins.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Handshake className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roundtable</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Trusted partner subrent network — preferred companies, trusted gear.</p>
        </div>
      </div>

      <Tabs defaultValue="partners" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="subrents">Active Subrents</TabsTrigger>
        </TabsList>

        <TabsContent value="partners">
          <RoundtablePartners />
        </TabsContent>
        <TabsContent value="inventory">
          <RoundtableInventory />
        </TabsContent>
        <TabsContent value="subrents">
          <RoundtableActiveSubrents />
        </TabsContent>
      </Tabs>
    </div>
  );
}